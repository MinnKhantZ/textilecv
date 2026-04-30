import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';

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
