/**
 * Multi-format document parsing. Normalizes uploaded files (PDF, DOCX, TXT, MD)
 * into plain text so the existing markdown header splitter can process them.
 */

export const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.pdf', '.docx'] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const SUPPORTED_MIME_TYPES = [
  'text/markdown',
  'text/plain',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
];

export function isSupportedExtension(ext: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

/**
 * Normalizes an uploaded file buffer into plain text.
 * - .md / .txt → utf-8 string as-is.
 * - .pdf       → extracted text via pdf-parse.
 * - .docx      → extracted text via mammoth.
 *
 * Throws a descriptive error if the format is unsupported or parsing fails.
 */
export async function normalizeToText(
  buffer: Buffer,
  ext: string
): Promise<string> {
  const normalizedExt = ext.toLowerCase();

  if (normalizedExt === '.md' || normalizedExt === '.txt') {
    return buffer.toString('utf-8');
  }

  if (normalizedExt === '.pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (normalizedExt === '.docx') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file extension: ${ext}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
}
