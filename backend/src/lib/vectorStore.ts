import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';

const COLLECTION_NAME = 'career_agent';

export async function getVectorStore(): Promise<Chroma> {
  const embeddings = new OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  try {
    return await Chroma.fromExistingCollection(embeddings, {
      collectionName: COLLECTION_NAME,
      url: process.env.CHROMA_URL ?? 'http://localhost:8000',
    });
  } catch {
    throw new Error(
      `ChromaDB collection "${COLLECTION_NAME}" not found. ` +
        'Please add your data files to backend/data/ and run: npm run ingest'
    );
  }
}

/**
 * Builds targeted sub-queries from a job description so the vector search
 * retrieves diverse, relevant chunks rather than repeatedly hitting the
 * same top chunk.
 *
 * Strategy: run one broad MMR query against the full JD plus one narrower
 * query per source category (projects vs about/identity) to guarantee
 * coverage from both data sources.
 */
export async function retrieveContext(
  vectorStore: Chroma,
  jobDescription: string,
  k = 14,
): Promise<Document[]> {
  const seen = new Set<string>();
  const results: Document[] = [];

  const addUnique = (docs: Document[]) => {
    for (const doc of docs) {
      const key = doc.pageContent.slice(0, 120);
      if (!seen.has(key)) {
        seen.add(key);
        results.push(doc);
      }
    }
  };

  // Query 1 — broad MMR over full JD (fetchK = 3× k to widen the candidate pool)
  if (vectorStore.maxMarginalRelevanceSearch) {
    const broad = await vectorStore.maxMarginalRelevanceSearch(
      jobDescription.trim(),
      { k, fetchK: k * 3 },
      undefined,
    );
    addUnique(broad);

    // Query 2 — targeted at technical skills section (first 600 chars usually has role summary)
    const skillsQuery = jobDescription.trim().slice(0, 600);
    if (skillsQuery.length > 50) {
      const skills = await vectorStore.maxMarginalRelevanceSearch(
        skillsQuery,
        { k: Math.ceil(k / 2), fetchK: k * 2 },
        undefined,
      );
      addUnique(skills);
    }
  } else {
    // Fallback: plain similarity search if MMR is unavailable
    const broad = await vectorStore.similaritySearch(jobDescription.trim(), k);
    addUnique(broad);
  }

  // Query 3 — ensure about/identity content is represented
  const aboutDocs = await vectorStore.similaritySearch('personal background values strengths career goals', Math.ceil(k / 3));
  addUnique(aboutDocs);

  return results;
}
