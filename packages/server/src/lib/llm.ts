import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { getDecryptedApiKey, getPublicAiSettings } from './db.js';

/**
 * Resolves the decrypted OpenAI API key from the vault.
 * Throws a user-facing error if no key is configured.
 */
export async function getApiKey(): Promise<string> {
  const key = await getDecryptedApiKey();
  if (!key) {
    throw new Error('OpenAI API key not configured. Set it in Settings.');
  }
  return key;
}

/**
 * Builds a ChatOpenAI model using the vault-decrypted key and the user's
 * Settings (model + baseUrl). The caller's `modelName` is used as a fallback
 * when no model is configured in Settings, preserving prior defaults.
 */
export async function getChatModel(
  opts: { modelName?: string; temperature?: number } = {}
): Promise<ChatOpenAI> {
  const apiKey = await getApiKey();
  const settings = await getPublicAiSettings();
  const modelName = settings.model || opts.modelName || 'gpt-4o-mini';
  const configuration: { baseURL?: string } = {};
  if (settings.baseUrl) configuration.baseURL = settings.baseUrl;
  return new ChatOpenAI({
    modelName,
    temperature: opts.temperature ?? 0,
    openAIApiKey: apiKey,
    configuration,
  });
}

/**
 * Builds OpenAI embeddings using the vault-decrypted key and the user's
 * Settings (baseUrl) for OpenAI-compatible endpoints.
 */
export async function getEmbeddings(): Promise<OpenAIEmbeddings> {
  const apiKey = await getApiKey();
  const settings = await getPublicAiSettings();
  const configuration: { baseURL?: string } = {};
  if (settings.baseUrl) configuration.baseURL = settings.baseUrl;
  return new OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
    openAIApiKey: apiKey,
    configuration,
  });
}
