import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { recordUpload, getAllUploadsStatus, hashFile, saveProfile, getPreference } from '../lib/db.js';
import { getDataDir } from '../lib/paths.js';
import { normalizeToText, isSupportedExtension, SUPPORTED_EXTENSIONS } from '../lib/parsers.js';
// runIngest is loaded dynamically so a heavy-dependency import failure can never
// prevent this router from being registered (which would cause 404 on all uploads).

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router();

const DATA_DIR = getDataDir();
const SAMPLES_DIR = path.join(__dirname, '../../samples');

const ALLOWED_TYPES: Record<string, { extensions: readonly string[]; storedName: string }> = {
  experience: {
    extensions: SUPPORTED_EXTENSIONS,
    storedName: 'master_experience.md',
  },
  about: {
    extensions: SUPPORTED_EXTENSIONS,
    storedName: 'about.md',
  },
};

// Store files in memory temporarily, then write ourselves
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── Ingest state (in-memory, resets on server restart) ──────────────────────

interface IngestState {
  status: 'idle' | 'running' | 'done' | 'error';
  lastRun: string | null;
  docCount: number;
  sources: string[];
  error: string | null;
}

let ingestState: IngestState = {
  status: 'idle',
  lastRun: null,
  docCount: 0,
  sources: [],
  error: null,
};

/**
 * Kicks off a background re-ingest. Does not block the HTTP response.
 */
function triggerIngest(): void {
  if (ingestState.status === 'running') return; // deduplicate concurrent triggers
  ingestState = { ...ingestState, status: 'running', error: null };

  const run = async () => {
      const { runIngest } = await import('../lib/ingest.js');
    return runIngest();
  };

  run()
    .then(async (result) => {
      console.log(`[ingest] ${result.success ? 'Complete' : 'Failed'}: ${result.sources.join(', ')}`);

      if (!result.success) {
        ingestState = {
          status: 'error',
          lastRun: new Date().toISOString(),
          docCount: result.docCount,
          sources: result.sources,
          error: result.error ?? null,
        };
        return;
      }

      // Keep status as 'running' while profile extraction completes so the
      // client continues polling and doesn't fetch a stale profile.
      // Run structured profile extraction after a successful ingest
      try {
        const { extractProfile } = await import('../lib/profileExtractor.js');
        const { profileTypeSchema } = await import('../lib/profileSchema.js');
        const existingTypeRaw = await getPreference('profile_type');
        const existingType = existingTypeRaw
          ? (profileTypeSchema.safeParse(existingTypeRaw).success ? (existingTypeRaw as never) : undefined)
          : undefined;
        const profile = await extractProfile(existingType);
        await saveProfile(JSON.stringify(profile));
        console.log('[ingest] Profile extracted and saved.');
      } catch (err) {
        console.error('[ingest] Profile extraction failed:', err instanceof Error ? err.message : String(err));
      }

      // Now set ingest to 'done' — both indexing and extraction are complete
      ingestState = {
        status: 'done',
        lastRun: new Date().toISOString(),
        docCount: result.docCount,
        sources: result.sources,
        error: null,
      };
    })
    .catch((err: unknown) => {
      ingestState = {
        status: 'error',
        lastRun: new Date().toISOString(),
        docCount: 0,
        sources: [],
        error: err instanceof Error ? err.message : String(err),
      };
      console.error('[ingest] Error:', ingestState.error);
    });
}

// ── Routes ───────────────────────────────────────────────────────────────────

const SAMPLE_FILES: Record<string, { filename: string; contentType: string }> = {
  experience: { filename: 'master_experience.md', contentType: 'text/markdown; charset=utf-8' },
  about: { filename: 'about.md', contentType: 'text/markdown; charset=utf-8' },
};

router.get('/samples/:fileType', async (req: Request, res: Response): Promise<void> => {
  const { fileType } = req.params as { fileType: string };
  const config = SAMPLE_FILES[fileType];

  if (!config) {
    res.status(400).json({ error: `Unknown file type "${fileType}"` });
    return;
  }

  const filePath = path.join(SAMPLES_DIR, config.filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: `Sample file not found. Place a file at backend/samples/${config.filename}` });
    return;
  }

  const content = fs.readFileSync(filePath);
  res.setHeader('Content-Type', config.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="sample_${config.filename}"`);
  res.send(content);
});

router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const uploads = await getAllUploadsStatus();
    const status: Record<string, { original_filename: string; uploaded_at: string; file_size: number }> = {};
    for (const u of uploads) {
      status[u.file_type] = {
        original_filename: u.original_filename,
        uploaded_at: u.uploaded_at,
        file_size: u.file_size,
      };
    }
    res.json({ files: status, ingest: ingestState });
  } catch (error: unknown) {
    console.error('[/uploads/status] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get upload status' });
  }
});

router.post('/:fileType', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileType } = req.params as { fileType: string };
    const config = ALLOWED_TYPES[fileType];

    if (!config) {
      res.status(400).json({ error: `Unknown file type "${fileType}". Valid types: ${Object.keys(ALLOWED_TYPES).join(', ')}` });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded. Send as multipart/form-data with field name "file".' });
      return;
    }

    const originalExt = path.extname(req.file.originalname).toLowerCase();
    if (!isSupportedExtension(originalExt)) {
      res.status(400).json({ error: `${fileType} must be one of: ${SUPPORTED_EXTENSIONS.join(', ')}` });
      return;
    }

    // Normalize the uploaded file to plain text, then store as .md so the
    // existing ingest pipeline (which reads .md) works unchanged.
    let normalizedText: string;
    try {
      normalizedText = await normalizeToText(req.file.buffer, originalExt);
    } catch (parseErr) {
      res.status(400).json({
        error: `Failed to parse ${originalExt} file: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      });
      return;
    }

    if (!normalizedText.trim()) {
      res.status(400).json({ error: 'The uploaded file contains no extractable text.' });
      return;
    }

    fs.mkdirSync(DATA_DIR, { recursive: true });
    const storedPath = path.join(DATA_DIR, config.storedName);
    fs.writeFileSync(storedPath, normalizedText, 'utf-8');

    const contentHash = hashFile(req.file.buffer);
    const id = await recordUpload(
      fileType,
      req.file.originalname,
      storedPath,
      req.file.size,
      contentHash
    );

    // Kick off background re-ingest so the vector index is immediately up to date
    triggerIngest();

    res.json({
      id,
      file_type: fileType,
      original_filename: req.file.originalname,
      stored_as: config.storedName,
      file_size: req.file.size,
      uploaded_at: new Date().toISOString(),
      ingest_triggered: true,
    });
  } catch (error: unknown) {
    console.error(`[/uploads/:fileType] Error:`, error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to upload file' });
  }
});

export default router;

