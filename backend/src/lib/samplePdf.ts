/**
 * Generates a minimal but fully valid PDF file in pure TypeScript/Node.js,
 * with no external dependencies. Byte offsets in the xref table are computed
 * at runtime from the actual object string lengths, so the output is always
 * spec-compliant regardless of content changes.
 */
export function createSamplePdf(): Buffer {
  // ── Page stream (drawing commands) ───────────────────────────────────────
  const streamLines = [
    'BT',
    '/F1 18 Tf',
    '50 750 Td',
    '(SAMPLE MASTER RESUME) Tj',
    '/F1 11 Tf',
    '0 -14 Td',
    '(Replace this with your actual resume PDF.) Tj',
    '0 -30 Td',
    '/F1 13 Tf',
    '(Your Full Name) Tj',
    '/F1 10 Tf',
    '0 -16 Td',
    '(your.email@example.com  |  +1 555-000-0000  |  City, State) Tj',
    '0 -28 Td',
    '/F1 13 Tf',
    '(EXPERIENCE) Tj',
    '/F1 10 Tf',
    '0 -18 Td',
    '(Company Name  |  Senior Software Engineer  \\(2022 - Present\\)) Tj',
    '0 -14 Td',
    '(- Led migration to microservices, cutting latency by 40%) Tj',
    '0 -14 Td',
    '(- Built real-time data pipeline processing 10 M events/day) Tj',
    '0 -14 Td',
    '(- Mentored 4 junior engineers; improved code review coverage to 95%) Tj',
    '0 -28 Td',
    '/F1 13 Tf',
    '(EDUCATION) Tj',
    '/F1 10 Tf',
    '0 -18 Td',
    '(University Name  |  B.S. Computer Science  \\(2018\\)) Tj',
    '0 -28 Td',
    '/F1 13 Tf',
    '(SKILLS) Tj',
    '/F1 10 Tf',
    '0 -18 Td',
    '(TypeScript, Python, Go  |  React, Node.js  |  AWS, Docker, Kubernetes) Tj',
    'ET',
  ];

  const stream = streamLines.join('\n') + '\n';
  const streamLen = Buffer.byteLength(stream, 'utf8');

  // ── PDF objects ───────────────────────────────────────────────────────────
  const o1 = '1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n';
  const o2 = '2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n';
  const o3 =
    '3 0 obj\n' +
    '<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' +
    '/Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>>\n' +
    'endobj\n';
  const o4 = `4 0 obj\n<</Length ${streamLen}>>\nstream\n${stream}endstream\nendobj\n`;
  const o5 =
    '5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>\nendobj\n';

  // ── Compute byte offsets ──────────────────────────────────────────────────
  const header = '%PDF-1.4\n';
  const hLen = Buffer.byteLength(header, 'utf8');

  const off1 = hLen;
  const off2 = off1 + Buffer.byteLength(o1, 'utf8');
  const off3 = off2 + Buffer.byteLength(o2, 'utf8');
  const off4 = off3 + Buffer.byteLength(o3, 'utf8');
  const off5 = off4 + Buffer.byteLength(o4, 'utf8');
  const xrefOff = off5 + Buffer.byteLength(o5, 'utf8');

  // ── xref table (each entry exactly 20 bytes: 10+1+5+1+1+1+\n) ────────────
  const pad = (n: number) => n.toString().padStart(10, '0');
  const xref =
    'xref\n' +
    '0 6\n' +
    `0000000000 65535 f \n` +
    `${pad(off1)} 00000 n \n` +
    `${pad(off2)} 00000 n \n` +
    `${pad(off3)} 00000 n \n` +
    `${pad(off4)} 00000 n \n` +
    `${pad(off5)} 00000 n \n` +
    `trailer\n<</Size 6 /Root 1 0 R>>\nstartxref\n${xrefOff}\n%%EOF\n`;

  const full = header + o1 + o2 + o3 + o4 + o5 + xref;
  return Buffer.from(full, 'utf8');
}
