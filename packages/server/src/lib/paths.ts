import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves the writable user data directory.
 *
 * In the published CLI flow, `process.env.APP_DATA_DIR` is set to the user's
 * data directory (defaults to ~/.textilecv/data) before the bundled server is
 * imported, so all writable data (SQLite db, uploaded/ingested markdown) lives
 * outside the npm package and survives upgrades.
 *
 * In standalone dev (running the server package directly), APP_DATA_DIR is
 * unset and we fall back to packages/server/data.
 */
export function getDataDir(): string {
  return process.env.APP_DATA_DIR || path.join(__dirname, '../../data');
}

/**
 * Read-only bundled assets (resume_template.tex, sample .md files) shipped
 * alongside the server code. Always package-relative — never user-writable.
 */
export function getSamplesDir(): string {
  return path.join(__dirname, '../../samples');
}

export function getDbPath(): string {
  return path.join(getDataDir(), 'textilecv.db');
}
