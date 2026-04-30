import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';

/**
 * Splits a markdown string on lines that start with one or more `#` characters,
 * keeping each section (header + body) as an intact chunk — preserving project
 * stories so they are retrieved together.
 */
function splitMarkdownByHeaders(content: string): Document[] {
  const lines = content.split('\n');
  const chunks: Document[] = [];
  let currentHeader = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    if (/^#{1,3} /.test(line)) {
      if (currentLines.length > 0) {
        const pageContent = currentLines.join('\n').trim();
        if (pageContent) {
          chunks.push(
            new Document({ pageContent, metadata: { header: currentHeader, source: 'projects' } })
          );
        }
      }
      currentHeader = line.replace(/^#+\s*/, '');
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  // Push the final chunk
  if (currentLines.length > 0) {
    const pageContent = currentLines.join('\n').trim();
    if (pageContent) {
      chunks.push(
        new Document({ pageContent, metadata: { header: currentHeader, source: 'projects' } })
      );
    }
  }

  return chunks;
}

async function ingest(): Promise<void> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in the environment.');
  }

  const embeddings = new OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const chromaUrl = process.env.CHROMA_URL ?? 'http://localhost:8000';
  const collectionName = 'career_agent';
  const allDocs: Document[] = [];

  // ── Ingest master_experience.md ───────────────────────────────────────────
  const mdPath = path.join(__dirname, '../data/master_experience.md');
  if (fs.existsSync(mdPath)) {
    const mdContent = fs.readFileSync(mdPath, 'utf-8');
    const projectDocs = splitMarkdownByHeaders(mdContent);
    allDocs.push(...projectDocs);
    console.log(`Loaded ${projectDocs.length} chunks from master_experience.md`);
  } else {
    console.warn('WARNING: data/master_experience.md not found. Skipping.');
  }

  // ── Ingest master_resume.pdf ──────────────────────────────────────────────
  const pdfPath = path.join(__dirname, '../data/master_resume.pdf');
  if (fs.existsSync(pdfPath)) {
    const pdfLoader = new PDFLoader(pdfPath);
    const pdfRawDocs = await pdfLoader.load();
    const resumeDocs = pdfRawDocs.map(
      (doc) =>
        new Document({
          pageContent: doc.pageContent,
          metadata: { ...doc.metadata, source: 'resume' },
        })
    );
    allDocs.push(...resumeDocs);
    console.log(`Loaded ${resumeDocs.length} pages from master_resume.pdf`);
  } else {
    console.warn('WARNING: data/master_resume.pdf not found. Skipping.');
  }

  if (allDocs.length === 0) {
    console.error(
      'No documents to ingest. Add your data files to backend/data/ and try again.'
    );
    process.exit(1);
  }

  console.log(
    `\nIngesting ${allDocs.length} documents into ChromaDB at ${chromaUrl}...`
  );

  await Chroma.fromDocuments(allDocs, embeddings, {
    collectionName,
    url: chromaUrl,
  });

  console.log('Ingestion complete! You can now start the backend server.');
}

ingest().catch((err: unknown) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
