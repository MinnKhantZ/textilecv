import type { Profile } from './profileSchema.js';

/**
 * Optional LaTeX section templates. These are provided to the LLM as available
 * building blocks. The LLM should render a section ONLY when the profile or
 * context contains data for it — empty sections are never rendered.
 *
 * Each template uses the same LaTeX macros defined in resume_template.tex
 * (\resumeItem, \resumeSubheading, \resumeProjectHeading, etc.) so the document
 * remains structurally consistent.
 */

export const OPTIONAL_SECTION_TEMPLATES = `
% ── Optional Sections ──────────────────────────────────────────────────────
% Render these ONLY if the candidate's profile/context has data for them.
% Copy the pattern; replace placeholders with real data.

% Publications (academic / research candidates)
\\section{Publications}
\\resumeItemListStart
  \\resumeItem{\\textbf{Publication Title} — Venue/Conference (Year). Authors. \\href{https://example.com}{Link}}
\\resumeItemListEnd

% Languages (international applicants)
\\section{Languages}
\\resumeItemListStart
  \\resumeItem{\\textbf{Language} (Proficiency), \\textbf{Language} (Proficiency)}
\\resumeItemListEnd

% Awards & Honors (all backgrounds)
\\section{Awards \\& Honors}
\\resumeItemListStart
  \\resumeItem{\\textbf{Award Name} — Issuer (Year)}
\\resumeItemListEnd

% Relevant Coursework (students / recent graduates)
\\section{Relevant Coursework}
\\resumeItemListStart
  \\resumeItem{Course One, Course Two, Course Three, Course Four}
\\resumeItemListEnd
`;

/**
 * Builds the ground-truth profile block injected into the resume prompt.
 * Tells the LLM exactly which contact values and links to use verbatim.
 *
 * CRITICAL: Header links (LinkedIn, GitHub, portfolio, etc.) are listed SEPARATELY
 * from project links so the LLM doesn't dump project URLs into the header.
 */
export function buildProfileGroundTruth(profile: Profile): string {
  const lines: string[] = ['STRUCTURED PROFILE (GROUND TRUTH — use these exact values):'];

  // ── Contact + Header Links ──
  lines.push('');
  lines.push('=== CONTACT & HEADER LINKS (put these in the header ONLY) ===');
  const c = profile.contact;
  lines.push(`Name: ${c.name || '(not provided)'}`);
  lines.push(`Email: ${c.email || '(not provided)'}`);
  if (c.phone) lines.push(`Phone: ${c.phone}`);
  if (c.location) lines.push(`Location: ${c.location}`);

  // Classify links: header links (profiles/sites) vs other
  const HEADER_LINK_TYPES = ['linkedin', 'github', 'portfolio', 'website', 'orcid', 'behance', 'scholar'];
  const headerLinks = (c.links ?? []).filter((l) => HEADER_LINK_TYPES.includes(l.type));
  const otherLinks = (c.links ?? []).filter((l) => !HEADER_LINK_TYPES.includes(l.type));

  if (headerLinks.length > 0) {
    lines.push('Header Links (use these in the \\begin{center} header):');
    for (const link of headerLinks) {
      lines.push(`  - ${link.type}: ${link.url}${link.label ? ` (${link.label})` : ''}`);
    }
  } else {
    lines.push('Header Links: (none — omit the links line in the header)');
  }

  if (otherLinks.length > 0) {
    lines.push('Other contact links (not for header — use contextually):');
    for (const link of otherLinks) {
      lines.push(`  - ${link.type}: ${link.url}`);
    }
  }

  if (profile.summary) {
    const s = profile.summary;
    lines.push(`Summary inputs: title=${s.title ?? '—'}, years=${s.yearsExperience ?? '—'}, domain=${s.domain ?? '—'}, preferences=${s.workPreferences ?? '—'}`);
  }

  if (profile.skills && profile.skills.length > 0) {
    lines.push('');
    lines.push('=== SKILLS UNIVERSE (curate/reorder per JD, but only use these) ===');
    for (const cat of profile.skills) {
      lines.push(`  ${cat.category}: ${cat.items.join(', ')}`);
    }
  }

  if (profile.experience && profile.experience.length > 0) {
    lines.push('');
    lines.push(`=== EXPERIENCE (${profile.experience.length} entries — pick top 2 most JD-relevant) ===`);
    for (const e of profile.experience) {
      lines.push(`  - ${e.title} @ ${e.company} (${e.dates})${e.location ? ` — ${e.location}` : ''}`);
    }
  }

  if (profile.projects && profile.projects.length > 0) {
    lines.push('');
    lines.push(`=== PROJECT LINKS (put these URLs in the Projects section ONLY, NOT the header) (${profile.projects.length} projects — pick top 3 most JD-relevant) ===`);
    for (const p of profile.projects) {
      const linkStr = p.links && p.links.length > 0 ? p.links.map((l) => `${l.type}: ${l.url}`).join('; ') : '(no link)';
      lines.push(`  - ${p.name} → ${linkStr}`);
    }
  }

  if (profile.education && profile.education.length > 0) {
    lines.push('');
    lines.push('=== EDUCATION ===');
    for (const e of profile.education) {
      lines.push(`  - ${e.degree}${e.field ? `, ${e.field}` : ''} — ${e.institution} (${e.dates})${e.gpa ? ` | GPA: ${e.gpa}` : ''}${e.location ? ` — ${e.location}` : ''}`);
    }
  }

  if (profile.certifications && profile.certifications.length > 0) {
    lines.push('');
    lines.push(`=== CERTIFICATIONS (${profile.certifications.length} total — pick top 3 most JD-relevant, link cert names with URLs if provided) ===`);
    for (const c2 of profile.certifications) {
      const urlPart = c2.url ? ` → ${c2.url}` : '';
      lines.push(`  - ${c2.name}${c2.provider ? ` — ${c2.provider}` : ''}${c2.year ? ` (${c2.year})` : ''}${urlPart}`);
    }
  }

  if (profile.publications && profile.publications.length > 0) {
    lines.push('');
    lines.push('=== PUBLICATIONS (include only if relevant — 1–2 max) ===');
    for (const p of profile.publications) {
      lines.push(`  - ${p.title}${p.venue ? ` — ${p.venue}` : ''}${p.year ? ` (${p.year})` : ''}${p.url ? ` ${p.url}` : ''}`);
    }
  }

  if (profile.languages && profile.languages.length > 0) {
    lines.push('');
    lines.push('=== LANGUAGES (include only if relevant) ===');
    for (const l of profile.languages) {
      lines.push(`  - ${l.language}${l.proficiency ? ` (${l.proficiency})` : ''}`);
    }
  }

  if (profile.awards && profile.awards.length > 0) {
    lines.push('');
    lines.push('=== AWARDS (include only if relevant — 1–2 max) ===');
    for (const a of profile.awards) {
      lines.push(`  - ${a.title}${a.issuer ? ` — ${a.issuer}` : ''}${a.year ? ` (${a.year})` : ''}`);
    }
  }

  if (profile.courses && profile.courses.length > 0) {
    lines.push('');
    lines.push('=== RELEVANT COURSEWORK (include only if student/recent grad) ===');
    for (const c3 of profile.courses) {
      lines.push(`  - ${c3.name}${c3.provider ? ` — ${c3.provider}` : ''}${c3.year ? ` (${c3.year})` : ''}`);
    }
  }

  return lines.join('\n');
}
