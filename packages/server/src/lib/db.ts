import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getDbPath } from './paths.js';
import * as vaultService from './vaultService.js';

const DB_PATH = getDbPath();

let _db: Database | null = null;

async function openDb(): Promise<Database> {
  if (_db) return _db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  applySchema(_db);
  persist(_db);
  return _db;
}

function applySchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_type TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      content_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS generation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      job_description TEXT,
      questions TEXT,
      output_text TEXT,
      artifact_path TEXT,
      compatible INTEGER NOT NULL DEFAULT 1,
      generated_at TEXT NOT NULL,
      preferences TEXT
    );

    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vault (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      salt TEXT NOT NULL,
      verifier TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

export function persist(db?: Database): void {
  const target = db ?? _db;
  if (!target) return;
  const data = target.export();
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ── Uploads ──────────────────────────────────────────────────────────────────

export interface UploadRecord {
  id: number;
  file_type: string;
  original_filename: string;
  stored_path: string;
  uploaded_at: string;
  file_size: number;
  content_hash: string;
}

export async function recordUpload(
  fileType: string,
  originalFilename: string,
  storedPath: string,
  fileSize: number,
  contentHash: string
): Promise<number> {
  const db = await openDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO uploads (file_type, original_filename, stored_path, uploaded_at, file_size, content_hash)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [fileType, originalFilename, storedPath, now, fileSize, contentHash]
  );
  const result = db.exec('SELECT last_insert_rowid() AS id');
  persist(db);
  return (result[0]?.values[0]?.[0] as number) ?? 0;
}

export async function getLatestUpload(fileType: string): Promise<UploadRecord | null> {
  const db = await openDb();
  const result = db.exec(
    `SELECT id, file_type, original_filename, stored_path, uploaded_at, file_size, content_hash
     FROM uploads WHERE file_type = ? ORDER BY uploaded_at DESC LIMIT 1`,
    [fileType]
  );
  if (!result[0]?.values[0]) return null;
  const [id, ft, ofn, sp, ua, fs_size, ch] = result[0].values[0];
  return {
    id: id as number,
    file_type: ft as string,
    original_filename: ofn as string,
    stored_path: sp as string,
    uploaded_at: ua as string,
    file_size: fs_size as number,
    content_hash: ch as string,
  };
}

export async function getAllUploadsStatus(): Promise<UploadRecord[]> {
  const db = await openDb();
  const result = db.exec(`
    SELECT id, file_type, original_filename, stored_path, uploaded_at, file_size, content_hash
    FROM uploads
    WHERE id IN (
      SELECT MAX(id) FROM uploads GROUP BY file_type
    )
    ORDER BY file_type
  `);
  if (!result[0]) return [];
  return result[0].values.map(([id, ft, ofn, sp, ua, fs_size, ch]) => ({
    id: id as number,
    file_type: ft as string,
    original_filename: ofn as string,
    stored_path: sp as string,
    uploaded_at: ua as string,
    file_size: fs_size as number,
    content_hash: ch as string,
  }));
}

// ── Generation log ───────────────────────────────────────────────────────────

export interface GenerationRecord {
  id: number;
  type: string;
  job_description: string | null;
  questions: string | null;
  output_text: string | null;
  artifact_path: string | null;
  compatible: number;
  generated_at: string;
  preferences: string | null;
}

export async function logGeneration(entry: {
  type: string;
  jobDescription?: string;
  questions?: string[];
  outputText?: string;
  artifactPath?: string;
  compatible?: boolean;
  preferences?: string;
}): Promise<number> {
  const db = await openDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO generation_log (type, job_description, questions, output_text, artifact_path, compatible, generated_at, preferences)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.type,
      entry.jobDescription ?? null,
      entry.questions ? JSON.stringify(entry.questions) : null,
      entry.outputText ?? null,
      entry.artifactPath ?? null,
      entry.compatible !== false ? 1 : 0,
      now,
      entry.preferences ?? null,
    ]
  );
  const result = db.exec('SELECT last_insert_rowid() AS id');
  persist(db);
  return (result[0]?.values[0]?.[0] as number) ?? 0;
}

export async function getGenerationLogs(limit = 50): Promise<GenerationRecord[]> {
  const db = await openDb();
  const result = db.exec(
    `SELECT id, type, job_description, questions, output_text, artifact_path, compatible, generated_at, preferences
     FROM generation_log ORDER BY generated_at DESC LIMIT ?`,
    [limit]
  );
  if (!result[0]) return [];
  return result[0].values.map(([id, type, jd, qs, ot, ap, comp, ga, pref]) => ({
    id: id as number,
    type: type as string,
    job_description: jd as string | null,
    questions: qs as string | null,
    output_text: ot as string | null,
    artifact_path: ap as string | null,
    compatible: comp as number,
    generated_at: ga as string,
    preferences: pref as string | null,
  }));
}

export async function getGenerationLogById(id: number): Promise<GenerationRecord | null> {
  const db = await openDb();
  const result = db.exec(
    `SELECT id, type, job_description, questions, output_text, artifact_path, compatible, generated_at, preferences
     FROM generation_log WHERE id = ?`,
    [id]
  );
  if (!result[0]?.values[0]) return null;
  const [rid, type, jd, qs, ot, ap, comp, ga, pref] = result[0].values[0];
  return {
    id: rid as number,
    type: type as string,
    job_description: jd as string | null,
    questions: qs as string | null,
    output_text: ot as string | null,
    artifact_path: ap as string | null,
    compatible: comp as number,
    generated_at: ga as string,
    preferences: pref as string | null,
  };
}

// ── Preferences ──────────────────────────────────────────────────────────────

export async function setPreference(key: string, value: string): Promise<void> {
  const db = await openDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO preferences (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, now]
  );
  persist(db);
}

export async function getPreference(key: string): Promise<string | null> {
  const db = await openDb();
  const result = db.exec('SELECT value FROM preferences WHERE key = ?', [key]);
  return (result[0]?.values[0]?.[0] as string) ?? null;
}

export async function getAllPreferences(): Promise<Record<string, string>> {
  const db = await openDb();
  const result = db.exec('SELECT key, value FROM preferences ORDER BY key');
  if (!result[0]) return {};
  return Object.fromEntries(result[0].values.map(([k, v]) => [k as string, v as string]));
}

// ── Profile (structured) ─────────────────────────────────────────────────────

export async function saveProfile(data: string): Promise<void> {
  const db = await openDb();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO profile (id, data, updated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    [data, now]
  );
  persist(db);
}

export async function getProfileData(): Promise<string | null> {
  const db = await openDb();
  const result = db.exec('SELECT data FROM profile WHERE id = 1');
  return (result[0]?.values[0]?.[0] as string) ?? null;
}

// ── Utility ──────────────────────────────────────────────────────────────────

export function hashFile(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ── Vault & AI settings ──────────────────────────────────────────────────────

export async function deletePreference(key: string): Promise<void> {
  const db = await openDb();
  db.run('DELETE FROM preferences WHERE key = ?', [key]);
  persist(db);
}

export async function isVaultSetup(): Promise<boolean> {
  const db = await openDb();
  const result = db.exec('SELECT id FROM vault WHERE id = 1');
  return !!result[0]?.values[0];
}

export async function getVaultMeta(): Promise<{ salt: string; verifier: string } | null> {
  const db = await openDb();
  const result = db.exec('SELECT salt, verifier FROM vault WHERE id = 1');
  if (!result[0]?.values[0]) return null;
  return { salt: result[0].values[0][0] as string, verifier: result[0].values[0][1] as string };
}

export async function setupVault(password: string): Promise<void> {
  const salt = vaultService.generateSalt();
  const { verifier } = vaultService.setupVaultPassword(password, salt);
  const db = await openDb();
  const now = new Date().toISOString();
  db.run(
    'INSERT OR REPLACE INTO vault (id, salt, verifier, created_at) VALUES (1, ?, ?, ?)',
    [salt, verifier, now]
  );
  persist(db);
}

export async function getDecryptedApiKey(): Promise<string | null> {
  const enc = await getPreference('ai_api_key_enc');
  if (!enc) return null;
  try {
    return vaultService.decrypt(enc);
  } catch {
    return null;
  }
}

export interface PublicAiSettings {
  provider: string;
  model: string;
  baseUrl: string;
  hasApiKey: boolean;
}

export async function getPublicAiSettings(): Promise<PublicAiSettings> {
  const provider = (await getPreference('ai_provider')) || 'openai';
  const model = (await getPreference('ai_model')) || '';
  const baseUrl = (await getPreference('ai_base_url')) || '';
  const enc = await getPreference('ai_api_key_enc');
  return { provider, model, baseUrl, hasApiKey: !!enc };
}

export async function saveAiSettings(patch: {
  provider?: string;
  model?: string;
  baseUrl?: string;
  apiKey?: string | null;
}): Promise<void> {
  if (patch.provider !== undefined) await setPreference('ai_provider', patch.provider);
  if (patch.model !== undefined) await setPreference('ai_model', patch.model);
  if (patch.baseUrl !== undefined) await setPreference('ai_base_url', patch.baseUrl);
  if (patch.apiKey !== undefined) {
    if (patch.apiKey && patch.apiKey.length > 0) {
      await setPreference('ai_api_key_enc', vaultService.encrypt(patch.apiKey));
    } else {
      await deletePreference('ai_api_key_enc');
    }
  }
}

export async function changeMasterPassword(
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const meta = await getVaultMeta();
  if (!meta) return false;
  if (!vaultService.unlockWithPassword(currentPassword, meta.salt, meta.verifier)) return false;

  // Decrypt the existing API key under the old key before rekeying.
  const existingKey = await getDecryptedApiKey();

  const newSalt = vaultService.generateSalt();
  const { verifier: newVerifier } = vaultService.setupVaultPassword(newPassword, newSalt);

  // Re-encrypt the API key under the new key.
  let newEnc: string | null = null;
  if (existingKey) {
    newEnc = vaultService.encrypt(existingKey);
  }

  const db = await openDb();
  const now = new Date().toISOString();
  db.run('UPDATE vault SET salt = ?, verifier = ?, created_at = ? WHERE id = 1', [
    newSalt,
    newVerifier,
    now,
  ]);
  if (newEnc) {
    db.run(
      `INSERT INTO preferences (key, value, updated_at) VALUES ('ai_api_key_enc', ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [newEnc, now]
    );
  }
  persist(db);
  return true;
}
