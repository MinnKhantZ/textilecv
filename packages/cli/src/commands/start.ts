import { startStudio } from '../server.js';
import { readConfig, type TextileCVConfig } from '../config.js';
import { ensureChromaRunning } from '../chroma.js';
import pc from 'picocolors';

interface StartOptions {
  port?: string;
}

export async function studio(options: StartOptions): Promise<void> {
  const config: TextileCVConfig = readConfig();

  if (options.port) {
    config.port = Number(options.port);
  }

  // Ensure ChromaDB is running before starting the server
  const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
  const chromaPort = Number(new URL(chromaUrl).port) || 8000;

  console.log(pc.cyan('\n  TextileCV — Starting...\n'));

  await ensureChromaRunning(chromaPort);

  await startStudio(config);
}
