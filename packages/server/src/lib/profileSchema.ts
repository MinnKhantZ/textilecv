import { z } from 'zod';

/**
 * Universal profile schema.
 *
 * Design principles:
 * - Every field except contact.name and contact.email is optional, so the schema
 *   works for any background (students, academics, trades, designers, engineers).
 * - Links are a dynamic typed list (not fixed linkedin/github/portfolio fields)
 *   so any kind of professional profile (ORCID, Behance, Scholar, personal site)
 *   can be represented.
 * - All section arrays are optional; generation omits sections with no data.
 */

export const profileLinkSchema = z.object({
  type: z.string().describe("Free-form: 'linkedin' | 'github' | 'portfolio' | 'website' | 'orcid' | 'behance' | 'scholar' | 'other'"),
  url: z.string().url(),
  label: z.string().optional(),
});

export const contactSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(profileLinkSchema).optional(),
});

export const summarySchema = z.object({
  title: z.string().optional().describe('Professional title, e.g. "Full-Stack Developer"'),
  yearsExperience: z.union([z.string(), z.number()]).optional(),
  domain: z.string().optional().describe('Primary domain, e.g. "backend systems", "UX design"'),
  workPreferences: z.string().optional().describe('e.g. "remote", "open to relocation", "timezone overlap"'),
});

export const skillCategorySchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
});

export const experienceEntrySchema = z.object({
  company: z.string(),
  title: z.string(),
  dates: z.string(),
  location: z.string().optional(),
  bullets: z.array(z.string()).optional(),
});

export const projectEntrySchema = z.object({
  name: z.string(),
  links: z.array(profileLinkSchema).optional(),
});

export const educationEntrySchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional(),
  gpa: z.string().optional(),
  dates: z.string(),
  location: z.string().optional(),
});

export const certificationEntrySchema = z.object({
  name: z.string(),
  provider: z.string().optional(),
  year: z.string().optional(),
  url: z.string().url().optional(),
});

export const publicationEntrySchema = z.object({
  title: z.string(),
  venue: z.string().optional(),
  authors: z.string().optional(),
  year: z.string().optional(),
  url: z.string().url().optional(),
});

export const languageEntrySchema = z.object({
  language: z.string(),
  proficiency: z.string().optional(),
});

export const awardEntrySchema = z.object({
  title: z.string(),
  issuer: z.string().optional(),
  year: z.string().optional(),
  description: z.string().optional(),
});

export const courseEntrySchema = z.object({
  name: z.string(),
  provider: z.string().optional(),
  year: z.string().optional(),
});

export const profileTypeSchema = z.enum([
  'student',
  'engineering',
  'design',
  'business',
  'academic',
  'trades',
  'other',
]);

export const profileSchema = z.object({
  contact: contactSchema,
  summary: summarySchema.optional(),
  skills: z.array(skillCategorySchema).optional(),
  experience: z.array(experienceEntrySchema).optional(),
  projects: z.array(projectEntrySchema).optional(),
  education: z.array(educationEntrySchema).optional(),
  certifications: z.array(certificationEntrySchema).optional(),
  publications: z.array(publicationEntrySchema).optional(),
  languages: z.array(languageEntrySchema).optional(),
  awards: z.array(awardEntrySchema).optional(),
  courses: z.array(courseEntrySchema).optional(),
  profileType: profileTypeSchema.optional(),
  extractedAt: z.string(),
});

export type ProfileLink = z.infer<typeof profileLinkSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type SkillCategory = z.infer<typeof skillCategorySchema>;
export type ExperienceEntry = z.infer<typeof experienceEntrySchema>;
export type ProjectEntry = z.infer<typeof projectEntrySchema>;
export type EducationEntry = z.infer<typeof educationEntrySchema>;
export type CertificationEntry = z.infer<typeof certificationEntrySchema>;
export type PublicationEntry = z.infer<typeof publicationEntrySchema>;
export type LanguageEntry = z.infer<typeof languageEntrySchema>;
export type AwardEntry = z.infer<typeof awardEntrySchema>;
export type CourseEntry = z.infer<typeof courseEntrySchema>;
export type ProfileType = z.infer<typeof profileTypeSchema>;
export type Profile = z.infer<typeof profileSchema>;

/** A minimal valid profile (used as a fallback when extraction fails). */
export function emptyProfile(): Profile {
  return {
    contact: { name: '' },
    extractedAt: new Date().toISOString(),
  };
}
