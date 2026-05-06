import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const DB_PATH = path.join(__dirname, '../../data/career_agent.db');

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

// ── Utility ──────────────────────────────────────────────────────────────────

export function hashFile(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
