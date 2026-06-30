import express from 'express';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import os from 'os';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, '../client-dist');
const SERVER_DIST = path.resolve(__dirname, '../server-dist');

const CONFIG_DIR = path.join(os.homedir(), '.textilecv');

export interface StudioConfig {
  port: number;
  host: string;
  dataDir: string;
}

export async function startStudio(config: StudioConfig): Promise<void> {
  if (!fs.existsSync(CLIENT_DIST)) {
    console.error(
      `\nClient assets not found at:\n  ${CLIENT_DIST}\n\n` +
        'Run `npm run build` from the monorepo root to build and bundle everything.\n'
    );
    process.exit(1);
  }

  // Load .env from ~/.textilecv/ before any server module reads env vars
  const envPath = path.join(CONFIG_DIR, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  // Set env vars before any server module reads them
  process.env.APP_DATA_DIR = config.dataDir;
  process.env.PORT = String(config.port);

  // Dynamically import the server's createApp
  // Must use pathToFileURL on Windows — import() rejects bare C:\ paths
  const serverEntry = path.join(SERVER_DIST, 'index.js');
  const { createApp } = await import(pathToFileURL(serverEntry).href);
  const app = createApp({
    allowedOrigins: [
      `http://localhost:${config.port}`,
      `http://127.0.0.1:${config.port}`,
      `http://localhost:5173`,
      `http://127.0.0.1:5173`,
    ],
  });

  // Serve the pre-built React SPA — must come after API routes
  app.use(express.static(CLIENT_DIST));
  // SPA fallback: all unmatched routes return index.html
  app.use((_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });

  return new Promise((resolve, reject) => {
    app.listen(config.port, config.host, () => {
      console.log(`\n  TextileCV is running at http://${config.host}:${config.port}\n`);
      resolve();
    }).on('error', reject);
  });
}
