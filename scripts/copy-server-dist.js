#!/usr/bin/env node
// Copies packages/server/dist → packages/cli/server-dist after the server build.
import { cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'packages', 'server', 'dist');
const dest = join(root, 'packages', 'cli', 'server-dist');

if (!existsSync(src)) {
  console.error('Error: packages/server/dist not found. Run npm run build:server first.');
  process.exit(1);
}

cpSync(src, dest, { recursive: true });
console.log('Copied packages/server/dist → packages/cli/server-dist');
