import * as fs from 'fs';
import * as path from 'path';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { getDataDir } from './paths.js';
import { getEmbeddings } from './llm.js';

const DATA_DIR = getDataDir();
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
 * Removes documents with duplicate pageContent, keeping the first occurrence.
 */
function dedupeDocs(docs: Document[]): Document[] {
  const seen = new Set<string>();
  const out: Document[] = [];
  for (const d of docs) {
    const key = d.pageContent.trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

const MAX_CHUNK_SIZE = 1500;

/**
 * Splits any chunk larger than MAX_CHUNK_SIZE using RecursiveCharacterTextSplitter
 * so oversized sections (e.g. a headerless file or a very long project) don't
 * become one giant embedding. Preserves original metadata on each sub-chunk.
 */
async function splitOversizedChunks(docs: Document[]): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: MAX_CHUNK_SIZE,
    chunkOverlap: 150,
  });
  const out: Document[] = [];
  for (const doc of docs) {
    if (doc.pageContent.length <= MAX_CHUNK_SIZE) {
      out.push(doc);
      continue;
    }
    const subChunks = await splitter.splitText(doc.pageContent);
    for (const text of subChunks) {
      out.push(new Document({ pageContent: text, metadata: { ...doc.metadata } }));
    }
  }
  return out;
}

/**
 * Re-ingests all data files from the data directory into ChromaDB.
 * Safe to call multiple times — always rebuilds the collection from scratch by
 * deleting the existing collection before re-indexing all documents.
 *
 * Invoked automatically after every upload (see routes/uploads.ts); there is no
 * standalone CLI entry point.
 */
export async function runIngest(): Promise<IngestResult> {
  const embeddings = await getEmbeddings();

  const chromaUrl = process.env.CHROMA_URL ?? 'http://localhost:8000';
  const allDocs: Document[] = [];
  const sources: string[] = [];

  // ── master_experience.md ─────────────────────────────────────────────────
  const mdPath = path.join(DATA_DIR, 'master_experience.md');
  if (fs.existsSync(mdPath)) {
    const docs = await splitOversizedChunks(
      dedupeDocs(
        splitMarkdownByHeaders(fs.readFileSync(mdPath, 'utf-8'), 'projects')
          .filter((d) => d.pageContent.length > 10)
      )
    );
    allDocs.push(...docs);
    sources.push(`master_experience.md (${docs.length} chunks)`);
  }

  // ── about.md ─────────────────────────────────────────────────────────────
  const aboutPath = path.join(DATA_DIR, 'about.md');
  if (fs.existsSync(aboutPath)) {
    const docs = await splitOversizedChunks(
      dedupeDocs(
        splitMarkdownByHeaders(fs.readFileSync(aboutPath, 'utf-8'), 'about')
          .filter((d) => d.pageContent.length > 10)
      )
    );
    allDocs.push(...docs);
    sources.push(`about.md (${docs.length} chunks)`);
  }

  if (allDocs.length === 0) {
    return { success: false, docCount: 0, sources: [], error: 'No data files found. Upload your experience and about files first.' };
  }

  // Delete the existing collection so re-ingest truly rebuilds from scratch
  // instead of accumulating duplicate documents on every upload.
  try {
    const { ChromaClient } = await import('chromadb');
    const client = new ChromaClient({ path: chromaUrl });
    await client.deleteCollection({ name: COLLECTION_NAME });
  } catch {
    // Collection does not exist yet or Chroma unreachable — safe to ignore;
    // Chroma.fromDocuments below will recreate it.
  }

  await Chroma.fromDocuments(allDocs, embeddings, {
    collectionName: COLLECTION_NAME,
    url: chromaUrl,
  });

  return { success: true, docCount: allDocs.length, sources };
}
