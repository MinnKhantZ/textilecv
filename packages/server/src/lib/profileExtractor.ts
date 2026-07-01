import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import * as fs from 'fs';
import * as path from 'path';
import { profileSchema, emptyProfile, type Profile, type ProfileLink, type ProfileType } from './profileSchema.js';
import { getDataDir } from './paths.js';
import { getChatModel } from './llm.js';

const DATA_DIR = getDataDir();

// ── Pass 1: Deterministic regex extraction (free, instant, format-agnostic) ──

const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const PHONE_RE = /(\+?\d[\d\s().-]{8,}\d)/g;
const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;

function classifyUrl(url: string): ProfileLink['type'] {
  const u = url.toLowerCase().replace(/\/$/, '');
  // GitHub: github.com/username = profile (header), github.com/username/repo = repo (not header)
  if (u.includes('github.com/') && !u.includes('gist.github.com')) {
    const path = u.split('github.com/')[1] ?? '';
    const segments = path.split('/').filter(Boolean);
    return segments.length <= 1 ? 'github' : 'other';
  }
  if (u.includes('linkedin.com/in')) return 'linkedin';
  if (u.includes('orcid.org')) return 'orcid';
  if (u.includes('behance.net')) return 'behance';
  if (u.includes('scholar.google')) return 'scholar';
  // GitLab: same logic as GitHub
  if (u.includes('gitlab.com/')) {
    const path = u.split('gitlab.com/')[1] ?? '';
    const segments = path.split('/').filter(Boolean);
    return segments.length <= 1 ? 'github' : 'other';
  }
  if (u.includes('dribbble.com/')) {
    const path = u.split('dribbble.com/')[1] ?? '';
    const segments = path.split('/').filter(Boolean);
    return segments.length <= 1 ? 'behance' : 'other';
  }
  // Coursera/freeCodeCamp certification URLs → other (not header)
  if (u.includes('coursera.org') || u.includes('freecodecamp.org')) return 'other';
  return 'website';
}

interface RegexExtraction {
  emails: string[];
  phones: string[];
  links: ProfileLink[];
}

function extractWithRegex(text: string): RegexExtraction {
  const emails = [...new Set(text.match(EMAIL_RE) ?? [])];
  const rawPhones = text.match(PHONE_RE) ?? [];
  const phones = [...new Set(rawPhones.map((p) => p.trim()).filter((p) => p.replace(/\D/g, '').length >= 9 && p.length <= 25))];
  const urls = [...new Set(text.match(URL_RE) ?? [])];
  const links: ProfileLink[] = urls.map((url) => ({
    type: classifyUrl(url),
    url: url.replace(/[.,;:]+$/, ''),
  }));
  return { emails, phones, links };
}

// ── Pass 2: LLM structured extraction ──

const extractionPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are a profile extraction engine. Given a candidate's raw experience and about-me documents (already parsed to text), extract a structured profile.

CRITICAL RULES:
1. Extract ONLY information explicitly present in the documents. NEVER invent or guess.
2. For contact links, extract every URL you find and classify its type (linkedin, github, portfolio, website, orcid, behance, scholar, other).
3. Associate each project link with the correct project by name. Do NOT put project/demo URLs in contact.links — put them in the corresponding project's links array.
4. For skills, group them into the categories the candidate used (or sensible defaults).
5. Leave fields empty/omitted if the candidate did not provide them. A student with only education is valid.
6. The profileType should reflect the candidate's primary background: student, engineering, design, business, academic, trades, or other.
7. For dates, copy the candidate's date text verbatim (e.g. "Jan 2022 – Present", "2022 -- 2028").
8. MERGE CONSECUTIVE ROLES: If the candidate held multiple positions at the same company (e.g. full-time then part-time, or a promotion), combine them into ONE experience entry with a combined date range and the most senior title. Do NOT create separate entries for the same company.
9. For experience bullets, you MAY omit the bullets array — the full narrative stays in the vector store for RAG. Only include bullets if they are clearly itemized.
10. If a certification has a URL, include it in the url field.`,
  ],
  [
    'human',
    `EXPERIENCE DOCUMENT:
---
{experienceDoc}
---

ABOUT DOCUMENT:
---
{aboutDoc}
---

Extract the structured profile. Return valid JSON matching the schema.`,
  ],
]);

/**
 * Reads the raw data files from disk.
 */
function readDataFiles(): { experienceDoc: string; aboutDoc: string } {
  let experienceDoc = '';
  let aboutDoc = '';
  try {
    experienceDoc = fs.readFileSync(path.join(DATA_DIR, 'master_experience.md'), 'utf-8');
  } catch {
    // file may not exist
  }
  try {
    aboutDoc = fs.readFileSync(path.join(DATA_DIR, 'about.md'), 'utf-8');
  } catch {
    // file may not exist
  }
  return { experienceDoc, aboutDoc };
}

/**
 * Runs the full two-pass extraction: deterministic regex for URLs/email/phone,
 * then an LLM pass with structured output for the full profile. Regex-extracted
 * links and contact values override LLM values (more trustworthy for raw URLs).
 *
 * Returns a minimal valid profile if no data files exist.
 */
export async function extractProfile(existingProfileType?: ProfileType): Promise<Profile> {
  const { experienceDoc, aboutDoc } = readDataFiles();
  const combinedText = `${experienceDoc}\n\n${aboutDoc}`;

  if (!combinedText.trim()) {
    return emptyProfile();
  }

  // Pass 1: regex
  const regexResult = extractWithRegex(combinedText);

  // Pass 2: LLM structured output
  let profile: Profile;
  try {
    const llm = await getChatModel({ modelName: 'gpt-5.4-mini', temperature: 0 });

    // Try withStructuredOutput first (uses function calling / JSON mode)
    try {
      const structuredLlm = llm.withStructuredOutput(profileSchema);
      const chain = extractionPrompt.pipe(structuredLlm);
      profile = await chain.invoke({ experienceDoc, aboutDoc });
    } catch (structuredErr) {
      // withStructuredOutput failed — fall back to plain JSON prompt + manual parse
      console.warn('[profileExtractor] withStructuredOutput failed, trying JSON prompt fallback:', structuredErr instanceof Error ? structuredErr.message : String(structuredErr));
      const jsonChain = extractionPrompt.pipe(llm).pipe(new StringOutputParser());
      const raw = await jsonChain.invoke({ experienceDoc, aboutDoc });
      // Extract JSON from the response (LLM may wrap it in markdown fences)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('LLM did not return valid JSON');
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = profileSchema.safeParse(parsed);
      if (!validated.success) {
        console.warn('[profileExtractor] Schema validation failed:', validated.error.issues);
        throw new Error('Profile schema validation failed');
      }
      profile = validated.data;
    }
  } catch (llmErr) {
    console.error('[profileExtractor] LLM extraction failed, using regex-only fallback:', llmErr instanceof Error ? llmErr.message : String(llmErr));
    // LLM extraction failed — fall back to regex-only partial profile
    profile = {
      contact: {
        name: '',
        email: regexResult.emails[0] || undefined,
        phone: regexResult.phones[0],
        links: regexResult.links.length > 0 ? regexResult.links : undefined,
      },
      extractedAt: new Date().toISOString(),
    };
    return profile;
  }

  // Merge: regex values win for contact (more trustworthy for raw URLs)
  if (regexResult.emails.length > 0 && !profile.contact.email) {
    profile.contact.email = regexResult.emails[0];
  }
  if (regexResult.phones.length > 0 && !profile.contact.phone) {
    profile.contact.phone = regexResult.phones[0];
  }

  // Merge ONLY header-type links into contact.links (linkedin, github, portfolio, etc.)
  // Project/demo/certification URLs must NOT go in the header — they belong in
  // their respective sections and the LLM should associate them with projects.
  const HEADER_LINK_TYPES = ['linkedin', 'github', 'portfolio', 'website', 'orcid', 'behance', 'scholar'];
  const headerRegexLinks = regexResult.links.filter((l) => HEADER_LINK_TYPES.includes(l.type));
  if (headerRegexLinks.length > 0) {
    const existing = (profile.contact.links ?? []).filter((l) => HEADER_LINK_TYPES.includes(l.type));
    const byUrl = new Map(existing.map((l) => [l.url, l]));
    for (const rl of headerRegexLinks) {
      if (!byUrl.has(rl.url)) {
        byUrl.set(rl.url, rl);
      }
    }
    profile.contact.links = [...byUrl.values()];
  }

  // SAFETY NET: strip any non-header links that the LLM may have placed in
  // contact.links (project repos, cert URLs, etc.). Only true profile-level
  // links should survive. This is a guaranteed fix regardless of LLM behavior.
  if (profile.contact.links && profile.contact.links.length > 0) {
    profile.contact.links = profile.contact.links.filter((l) => {
      if (!HEADER_LINK_TYPES.includes(l.type)) return false;
      // For github/gitlab/dribbble: only profile-level URLs (1 path segment),
      // not repo URLs (2+ segments)
      if (l.type === 'github' || l.type === 'behance') {
        const u = l.url.toLowerCase().replace(/\/$/, '');
        const domain = u.includes('github.com') ? 'github.com'
          : u.includes('gitlab.com') ? 'gitlab.com'
          : u.includes('dribbble.com') ? 'dribbble.com'
          : null;
        if (domain) {
          const path = u.split(`${domain}/`)[1] ?? '';
          const segments = path.split('/').filter(Boolean);
          return segments.length <= 1;
        }
      }
      // Exclude known certification/course URLs
      const u = l.url.toLowerCase();
      if (u.includes('coursera.org') || u.includes('freecodecamp.org')) return false;
      // For website/portfolio: only root-level URLs (no path or hash beyond root).
      // e.g. minkhantzaw.dev = portfolio (header), minkhantzaw.dev/#projects = sub-page (not header)
      if (l.type === 'website' || l.type === 'portfolio') {
        const urlObj = (() => { try { return new URL(l.url); } catch { return null; } })();
        if (urlObj) {
          const hasPath = urlObj.pathname.length > 1; // more than just "/"
          const hasHash = urlObj.hash.length > 0;
          if (hasPath || hasHash) return false;
        }
      }
      return true;
    });
    if (profile.contact.links.length === 0) {
      profile.contact.links = undefined;
    }
  }

  // Preserve a previously-declared profile type if the LLM didn't infer one
  if (!profile.profileType && existingProfileType) {
    profile.profileType = existingProfileType;
  }

  profile.extractedAt = new Date().toISOString();
  return profile;
}
