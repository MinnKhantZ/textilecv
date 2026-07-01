#!/usr/bin/env node
/**
 * Guard run by the CLI package's `prepublishOnly` script. Aborts `npm publish`
 * with a clear message if the build artifacts required for the published
 * package to function are missing or empty.
 *
 * This prevents shipping a broken tarball (e.g. after a fresh clone with no
 * `npm run build`, or when `bin/chroma/` runtime data would otherwise leak).
 */
import { existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliDir = join(__dirname, '..', 'packages', 'cli');

const required = ['bin/textilecv.js', 'dist', 'client-dist', 'server-dist', 'samples'];
const missing = [];
const empty = [];

for (const rel of required) {
  const abs = join(cliDir, rel);
  if (!existsSync(abs)) {
    missing.push(rel);
    continue;
  }
  const stat = statSync(abs);
  if (stat.isDirectory() && readdirSync(abs).length === 0) {
    empty.push(rel);
  }
}

if (missing.length > 0 || empty.length > 0) {
  console.error('\n  textilecv: refusing to publish an incomplete package.\n');
  if (missing.length > 0) {
    console.error('  Missing: ' + missing.join(', '));
  }
  if (empty.length > 0) {
    console.error('  Empty:   ' + empty.join(', '));
  }
  console.error('\n  Run a full build from the monorepo root first:\n');
  console.error('    npm run build\n');
  console.error('  (This builds client + server, copies them into the CLI, then compiles the CLI.)\n');
  process.exit(1);
}

console.log('prepublishOnly: CLI build artifacts present.');
