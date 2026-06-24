import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

dotenv.config();

import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, '../data');
const COLLECTION_NAME = 'textilecv';

/**
 * Splits a markdown string on lines that start with one or more `#` characters,
 * keeping each section (header + body) as an intact chunk — preserving project
 * stories so they are retrieved together.
 */
function splitMarkdownByHeaders(content: string, source: string): Document[] {
  const lines = content.split('\n');
  const chunks: Document[] = [];
  let currentHeader = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    if (/^#{1,3} /.test(line)) {
      if (currentLines.length > 0) {
        const pageContent = currentLines.join('\n').trim();
        if (pageContent) {
          chunks.push(new Document({ pageContent, metadata: { header: currentHeader, source } }));
        }
      }
      currentHeader = line.replace(/^#+\s*/, '');
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    const pageContent = currentLines.join('\n').trim();
    if (pageContent) {
      chunks.push(new Document({ pageContent, metadata: { header: currentHeader, source } }));
    }
  }

  return chunks;
}

export interface IngestResult {
  success: boolean;
  docCount: number;
  sources: string[];
  error?: string;
}

/**
 * Re-ingests all data files from backend/data/ into ChromaDB.
 * Safe to call multiple times — always rebuilds the collection from scratch.
 */
export async function runIngest(): Promise<IngestResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in the environment.');
  }

  const embeddings = new OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const chromaUrl = process.env.CHROMA_URL ?? 'http://localhost:8000';
  const allDocs: Document[] = [];
  const sources: string[] = [];

  // ── master_experience.md ─────────────────────────────────────────────────
  const mdPath = path.join(DATA_DIR, 'master_experience.md');
  if (fs.existsSync(mdPath)) {
    const docs = splitMarkdownByHeaders(fs.readFileSync(mdPath, 'utf-8'), 'projects')
      .filter((d) => d.pageContent.length > 10);
    allDocs.push(...docs);
    sources.push(`master_experience.md (${docs.length} chunks)`);
  }

  // ── about.md ─────────────────────────────────────────────────────────────
  const aboutPath = path.join(DATA_DIR, 'about.md');
  if (fs.existsSync(aboutPath)) {
    const docs = splitMarkdownByHeaders(fs.readFileSync(aboutPath, 'utf-8'), 'about')
      .filter((d) => d.pageContent.length > 10);
    allDocs.push(...docs);
    sources.push(`about.md (${docs.length} chunks)`);
  }

  if (allDocs.length === 0) {
    return { success: false, docCount: 0, sources: [], error: 'No data files found in backend/data/' };
  }

  await Chroma.fromDocuments(allDocs, embeddings, {
    collectionName: COLLECTION_NAME,
    url: chromaUrl,
  });

  return { success: true, docCount: allDocs.length, sources };
}

// ── CLI entry point ───────────────────────────────────────────────────────────
const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  runIngest()
    .then((result) => {
      if (result.success) {
        console.log(`Ingested ${result.docCount} documents from: ${result.sources.join(', ')}`);
        console.log('Ingestion complete! You can now start the backend server.');
      } else {
        console.error('Ingestion failed:', result.error);
        process.exit(1);
      }
    })
    .catch((err: unknown) => {
      console.error('Ingestion failed:', err);
      process.exit(1);
    });
}

