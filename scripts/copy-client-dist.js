#!/usr/bin/env node
// Copies packages/client/dist → packages/cli/client-dist after the client build.
import { cpSync, rmSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, '../packages/client/dist');
const dest = resolve(__dirname, '../packages/cli/client-dist');

if (!existsSync(src)) {
  console.error('Error: packages/client/dist not found.');
  console.error('Run `npm run build:client` first.');
  process.exit(1);
}

if (existsSync(dest)) {
  rmSync(dest, { recursive: true, force: true });
}

cpSync(src, dest, { recursive: true });
console.log('Copied packages/client/dist → packages/cli/client-dist');
