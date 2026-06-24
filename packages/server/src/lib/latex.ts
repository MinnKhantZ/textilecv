import { Readable } from 'stream';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

type NodeLatexFn = (
  input: Readable,
  options?: Record<string, unknown>
) => NodeJS.ReadableStream;

// node-latex ships as CommonJS; use createRequire to load it from ESM.
const require = createRequire(import.meta.url);
const nodeLatex = require('node-latex') as NodeLatexFn;

function findPdflatex(): string {
  // Try PATH first
  const which = process.platform === 'win32' ? 'where' : 'which';
  try {
    const result = execSync(`${which} pdflatex`, { encoding: 'utf-8' }).trim().split('\n')[0];
    if (result && existsSync(result)) return result;
  } catch { /* not on PATH */ }

  // Common MiKTeX locations on Windows
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const candidates = [
      join(localAppData, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', 'pdflatex.exe'),
      join(localAppData, 'Programs', 'MiKTeX', 'miktex', 'bin', 'pdflatex.exe'),
      'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe',
    ];
    for (const p of candidates) {
      if (existsSync(p)) return p;
    }
  }
  return 'pdflatex'; // fallback to PATH
}

const PDFLATEX_PATH = findPdflatex();

function sanitizeLatex(raw: string): string {
  let source = raw.trim();

  // Remove markdown code fences if model accidentally includes them.
  source = source.replace(/^```(?:latex)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Keep pdflatex-compatible output.
  source = source
    .replace(/\\usepackage\{fontspec\}\s*/g, '')
    .replace(/\\setmainfont\{[^}]*\}\s*/g, '');

  // Replace common unicode punctuation that often breaks pdflatex.
  source = source
    .replace(/\u2013|\u2014/g, '--')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2026/g, '...');

  if (!source.includes('\\documentclass')) {
    source = `\\documentclass[11pt]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.5em}
\\begin{document}
${source}
\\end{document}`;
  }

  return source;
}

async function compileOnce(latexSource: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const input = Readable.from([latexSource]);
    const pdfStream = nodeLatex(input, {
      cmd: PDFLATEX_PATH,
      args: ['-halt-on-error'],
    });

    pdfStream.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    pdfStream.on('error', (error: unknown) => {
      reject(error instanceof Error ? error : new Error('Failed to compile LaTeX'));
    });
    pdfStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

export async function compileLatexToPdfBuffer(latexSource: string): Promise<Buffer> {
  const sanitized = sanitizeLatex(latexSource);
  try {
    return await compileOnce(sanitized);
  } catch (firstError: unknown) {
    // Fallback repair: if model omitted document environment but had documentclass.
    let repaired = sanitized;
    if (!repaired.includes('\\begin{document}')) {
      repaired = repaired.replace(
        /\\documentclass(?:\[[^\]]*\])?\{[^}]*\}/,
        (match) =>
          `${match}
\\usepackage[margin=1in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0.5em}
\\begin{document}`
      );
      repaired = `${repaired}\n\\end{document}\n`;
    }

    try {
      return await compileOnce(repaired);
    } catch (secondError: unknown) {
      const reason =
        secondError instanceof Error
          ? secondError.message
          : firstError instanceof Error
            ? firstError.message
            : 'Unknown LaTeX compilation error';
      throw new Error(`LaTeX Syntax Error\n${reason}`);
    }
  }
}
