import type { Profile } from './profileSchema.js';

export interface ValidationWarning {
  type: 'placeholder' | 'empty_section' | 'link_mismatch' | 'too_many_items' | 'links_in_header';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  warnings: ValidationWarning[];
}

const PLACEHOLDER_PATTERNS = [
  /FirstName LastName/i,
  /email@example\.com/i,
  /\busername\b/i,
  /Project Title (One|Two|Three)/i,
  /Company Name/i,
  /University Name/i,
  /Programming Language [A-C]/i,
  /Framework [A-D]/i,
  /Degree, Field of Study/i,
  /GPA: X\.XX/i,
  /Certification (One|Two|Three)/i,
];

/**
 * Validates generated LaTeX for common quality issues:
 * - Leftover placeholder text from the template
 * - Empty sections (\section{...} with no content until the next \section or \end{document})
 * - Header links not matching the profile's contact links
 * - Too many projects (>3) or certifications (>3) for one-page optimization
 * - Non-header links (project/certification URLs) leaking into the header block
 */
export function validateLatex(latex: string, profile: Profile): ValidationResult {
  const warnings: ValidationWarning[] = [];

  // Check for leftover placeholders
  for (const pattern of PLACEHOLDER_PATTERNS) {
    const match = latex.match(pattern);
    if (match) {
      warnings.push({
        type: 'placeholder',
        message: `Leftover template placeholder found: "${match[0]}"`,
      });
    }
  }

  // Check for empty sections — a \section{...} followed immediately by another
  // \section{...} or \end{document} with only whitespace/comments between them.
  const emptySectionRe = /\\section\{([^}]*)\}[\s\n]*(\\section\{|\\end\{document\})/g;
  let m: RegExpExecArray | null;
  while ((m = emptySectionRe.exec(latex)) !== null) {
    warnings.push({
      type: 'empty_section',
      message: `Empty section detected: "${m[1]}" has no content.`,
    });
  }

  // Check header links match profile (only header-type links should be in header)
  const HEADER_LINK_TYPES = ['linkedin', 'github', 'portfolio', 'website', 'orcid', 'behance', 'scholar'];
  const headerLinks = (profile.contact.links ?? []).filter((l) => HEADER_LINK_TYPES.includes(l.type));
  for (const link of headerLinks) {
    if (!latex.includes(link.url)) {
      warnings.push({
        type: 'link_mismatch',
        message: `Profile header link not found in output: ${link.url}`,
      });
    }
  }

  // Check for project links leaking into the header block
  const projectUrls = (profile.projects ?? []).flatMap((p) => (p.links ?? []).map((l) => l.url));
  const headerBlockMatch = latex.match(/\\begin\{center\}[\s\S]*?\\end\{center\}/);
  if (headerBlockMatch && projectUrls.length > 0) {
    const headerBlock = headerBlockMatch[0];
    for (const url of projectUrls) {
      if (headerBlock.includes(url)) {
        warnings.push({
          type: 'links_in_header',
          message: `Project URL found in header block (should be in Projects section only): ${url}`,
        });
      }
    }
  }

  // Check for too many projects (>3 \resumeProjectHeading instances)
  const projectCount = (latex.match(/\\resumeProjectHeading/g) ?? []).length;
  if (projectCount > 3) {
    warnings.push({
      type: 'too_many_items',
      message: `Too many projects (${projectCount}) — maximum is 3 for one-page optimization. Remove the least JD-relevant ones.`,
    });
  }

  // Check for too many certifications (>3 items in Certifications section)
  const certsSectionMatch = latex.match(/\\section\{Certifications?\}[\s\S]*?(?=\\section\{|\\end\{document\})/);
  if (certsSectionMatch) {
    const certItems = (certsSectionMatch[0].match(/\\resumeItem\{/g) ?? []).length;
    if (certItems > 3) {
      warnings.push({
        type: 'too_many_items',
        message: `Too many certifications (${certItems}) — maximum is 3 for one-page optimization.`,
      });
    }
  }

  return { valid: warnings.length === 0, warnings };
}

/**
 * Builds a corrective note to append to the prompt when validation fails,
 * so the auto-retry can address the specific issues.
 */
export function buildCorrectiveNote(warnings: ValidationWarning[]): string {
  const lines = [
    '',
    '---',
    'CORRECTION REQUIRED — your previous output had these issues. Fix ALL of them:',
  ];
  for (const w of warnings) {
    lines.push(`- ${w.message}`);
  }
  lines.push('Regenerate the FULL LaTeX document fixing every issue above.');
  return lines.join('\n');
}
