import type { Profile, ProfileType } from './profileSchema.js';

export type Criticality = 'critical' | 'recommended' | 'optional';

export interface FieldCheck {
  key: string;
  label: string;
  present: boolean;
  criticality: Criticality;
  tip: string;
}

export interface CompletenessResult {
  fields: FieldCheck[];
  score: number; // 0-100
  hasSubstantiveSection: boolean;
}

interface ProfileTypeConfig {
  label: string;
  recommendedFields: { key: string; tip: string }[];
}

const PROFILE_TYPE_CONFIG: Record<ProfileType, ProfileTypeConfig> = {
  student: {
    label: 'Student',
    recommendedFields: [
      { key: 'projects', tip: 'Add 2–3 projects (even coursework) to demonstrate hands-on skills.' },
      { key: 'courses', tip: 'List relevant coursework to show your academic focus.' },
      { key: 'education.gpa', tip: 'Include your GPA if it is 3.0 or above.' },
      { key: 'links', tip: 'Add a GitHub or portfolio link if you have code/design samples.' },
    ],
  },
  engineering: {
    label: 'Engineering',
    recommendedFields: [
      { key: 'links.github', tip: 'Add your GitHub profile so the resume can link to your code.' },
      { key: 'projects', tip: 'Include projects with live demo or repo links.' },
      { key: 'skills', tip: 'Provide a categorized skills list for JD-tailored matching.' },
    ],
  },
  design: {
    label: 'Design',
    recommendedFields: [
      { key: 'links.portfolio', tip: 'Add your portfolio or Behance link — essential for design roles.' },
      { key: 'projects', tip: 'Include case-study projects with links to live work.' },
    ],
  },
  business: {
    label: 'Business',
    recommendedFields: [
      { key: 'links.linkedin', tip: 'Add your LinkedIn profile — standard for business roles.' },
      { key: 'awards', tip: 'Include awards or leadership achievements.' },
    ],
  },
  academic: {
    label: 'Academic',
    recommendedFields: [
      { key: 'links.orcid', tip: 'Add your ORCID profile.' },
      { key: 'publications', tip: 'List your publications with DOIs/links.' },
      { key: 'education', tip: 'Include all degrees with fields and dates.' },
    ],
  },
  trades: {
    label: 'Trades',
    recommendedFields: [
      { key: 'certifications', tip: 'List licenses and certifications (critical for trades).' },
      { key: 'experience', tip: 'Include work history with dates.' },
    ],
  },
  other: {
    label: 'Other',
    recommendedFields: [
      { key: 'links', tip: 'Add any professional profile link (LinkedIn, personal site, etc.).' },
      { key: 'projects', tip: 'Include projects or work samples if relevant.' },
    ],
  },
};

function hasPath(profile: Profile, key: string): boolean {
  if (key === 'contact.name') return !!profile.contact.name;
  if (key === 'contact.email') return !!profile.contact.email;
  if (key === 'contact.phone') return !!profile.contact.phone;
  if (key === 'contact.location') return !!profile.contact.location;
  if (key === 'links') return !!(profile.contact.links && profile.contact.links.length > 0);
  if (key.startsWith('links.')) {
    const type = key.split('.')[1];
    return !!(profile.contact.links && profile.contact.links.some((l) => l.type === type));
  }
  if (key === 'summary') return !!profile.summary;
  if (key === 'skills') return !!(profile.skills && profile.skills.length > 0);
  if (key === 'experience') return !!(profile.experience && profile.experience.length > 0);
  if (key === 'projects') return !!(profile.projects && profile.projects.length > 0);
  if (key === 'education') return !!(profile.education && profile.education.length > 0);
  if (key === 'education.gpa') return !!(profile.education && profile.education.some((e) => e.gpa));
  if (key === 'certifications') return !!(profile.certifications && profile.certifications.length > 0);
  if (key === 'publications') return !!(profile.publications && profile.publications.length > 0);
  if (key === 'languages') return !!(profile.languages && profile.languages.length > 0);
  if (key === 'awards') return !!(profile.awards && profile.awards.length > 0);
  if (key === 'courses') return !!(profile.courses && profile.courses.length > 0);
  return false;
}

/**
 * Evaluates the completeness of a profile against universal criticals plus
 * role-tailored recommendations. Non-blocking — used for advisory UI display.
 */
export function evaluateCompleteness(profile: Profile): CompletenessResult {
  const profileType = profile.profileType ?? 'other';
  const config = PROFILE_TYPE_CONFIG[profileType];

  const fields: FieldCheck[] = [];

  // Universal criticals
  fields.push({
    key: 'contact.name',
    label: 'Full Name',
    present: !!profile.contact.name,
    criticality: 'critical',
    tip: 'Your name is required for the resume header.',
  });
  fields.push({
    key: 'contact.email',
    label: 'Email',
    present: !!profile.contact.email,
    criticality: 'critical',
    tip: 'Your email is required for the resume header. Add it to your About file.',
  });

  // Substantive section check (experience OR projects OR education)
  const hasSubstantiveSection =
    !!(profile.experience && profile.experience.length > 0) ||
    !!(profile.projects && profile.projects.length > 0) ||
    !!(profile.education && profile.education.length > 0);
  fields.push({
    key: 'substantive',
    label: 'At least one section (Experience, Projects, or Education)',
    present: hasSubstantiveSection,
    criticality: 'critical',
    tip: 'Upload your experience or education data so the resume has substance.',
  });

  // Recommended (role-tailored)
  for (const rec of config.recommendedFields) {
    fields.push({
      key: rec.key,
      label: rec.key,
      present: hasPath(profile, rec.key),
      criticality: 'recommended',
      tip: rec.tip,
    });
  }

  // Universal optional
  fields.push({
    key: 'contact.phone',
    label: 'Phone',
    present: !!profile.contact.phone,
    criticality: 'optional',
    tip: 'Optional — include if you want recruiters to call you.',
  });
  fields.push({
    key: 'contact.location',
    label: 'Location',
    present: !!profile.contact.location,
    criticality: 'optional',
    tip: 'Optional — city and country/region is enough.',
  });
  fields.push({
    key: 'summary',
    label: 'Summary inputs (title, years, domain)',
    present: !!profile.summary,
    criticality: 'optional',
    tip: 'Provides the AI with signals for a stronger professional summary.',
  });

  // Score: weighted by criticality
  const weights: Record<Criticality, number> = { critical: 3, recommended: 2, optional: 1 };
  let earned = 0;
  let possible = 0;
  for (const f of fields) {
    possible += weights[f.criticality];
    if (f.present) earned += weights[f.criticality];
  }
  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;

  return { fields, score, hasSubstantiveSection };
}
