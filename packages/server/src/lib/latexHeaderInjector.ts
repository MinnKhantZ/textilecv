import type { Profile, ProfileLink } from './profileSchema.js';

/** Link types that belong in the resume header (personal profiles/sites only). */
const HEADER_LINK_TYPES = ['linkedin', 'github', 'portfolio', 'website', 'orcid', 'behance', 'scholar'];

/**
 * Escapes LaTeX special characters in a string so it can be safely embedded.
 */
function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}');
}

/**
 * Formats a link for display in the header. Uses \href{url}{display} where the
 * display text is a cleaned version of the URL (strips protocol and trailing slash).
 */
function formatLink(link: ProfileLink): string {
  const escapedUrl = link.url;
  let display = link.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (display.length > 50) display = display.slice(0, 47) + '...';
  return `\\href{${escapedUrl}}{${escapeLatex(display)}}`;
}

/**
 * Builds the LaTeX header block from the structured profile contact info.
 * Only renders lines that have data — a user with no links gets no links line.
 * ONLY header-type links (LinkedIn, GitHub, portfolio, etc.) are rendered —
 * project/demo/certification URLs are never placed in the header.
 */
export function buildHeaderLatex(profile: Profile): string {
  const c = profile.contact;
  const lines: string[] = ['\\begin{center}'];

  if (c.name) {
    lines.push(`  {\\Huge \\scshape ${escapeLatex(c.name)}} \\\\ \\vspace{3pt}`);
  }

  if (c.location) {
    lines.push(`  ${escapeLatex(c.location)} \\\\ \\vspace{3pt}`);
  }

  // Email + phone line
  const contactParts: string[] = [];
  if (c.email) {
    contactParts.push(`\\href{mailto:${c.email}}{${escapeLatex(c.email)}}`);
  }
  if (c.phone) {
    contactParts.push(escapeLatex(c.phone));
  }
  if (contactParts.length > 0) {
    lines.push(`  ${contactParts.join(' \\quad | \\quad ')} \\\\ \\vspace{3pt}`);
  }

  // Links line — ONLY header-type links (personal profiles/sites)
  const headerLinks = (c.links ?? []).filter((l) => HEADER_LINK_TYPES.includes(l.type));
  if (headerLinks.length > 0) {
    const linkStrs = headerLinks.map(formatLink);
    lines.push(`  ${linkStrs.join(' \\quad | \\quad ')}`);
  }

  lines.push('\\end{center}');
  return lines.join('\n');
}

/**
 * Replaces the header block in the LLM-generated LaTeX with a deterministic
 * version built from the structured profile. This guarantees the header is
 * always correct regardless of LLM behavior.
 *
 * The header is the first \\begin{center}...\\end{center} block in the document.
 */
export function injectHeader(latex: string, profile: Profile): string {
  if (!profile.contact.name) {
    return latex; // nothing to inject without a name
  }

  const newHeader = buildHeaderLatex(profile);
  // Match the first \begin{center}...\end{center} block (non-greedy, multiline)
  const headerRe = /\\begin\{center\}[\s\S]*?\\end\{center\}/;
  if (headerRe.test(latex)) {
    return latex.replace(headerRe, newHeader);
  }
  // If no center block found, inject after \begin{document}
  return latex.replace(/\\begin\{document\}/, `\\begin{document}\n\n${newHeader}`);
}
