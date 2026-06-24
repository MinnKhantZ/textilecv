import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { recordUpload, getAllUploadsStatus, hashFile } from '../lib/db.js';
// runIngest is loaded dynamically so a heavy-dependency import failure can never
// prevent this router from being registered (which would cause 404 on all uploads).

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router();

const DATA_DIR = path.join(__dirname, '../../data');
const SAMPLES_DIR = path.join(__dirname, '../../samples');

const ALLOWED_TYPES: Record<string, { ext: string; mimeTypes: string[]; storedName: string }> = {
  experience: {
    ext: '.md',
    mimeTypes: ['text/markdown', 'text/plain', 'application/octet-stream'],
    storedName: 'master_experience.md',
  },
  about: {
    ext: '.md',
    mimeTypes: ['text/markdown', 'text/plain', 'application/octet-stream'],
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
    const { runIngest } = await import('../ingest');
    return runIngest();
  };

  run()
    .then((result) => {
      ingestState = {
        status: result.success ? 'done' : 'error',
        lastRun: new Date().toISOString(),
        docCount: result.docCount,
        sources: result.sources,
        error: result.error ?? null,
      };
      console.log(`[ingest] ${result.success ? 'Complete' : 'Failed'}: ${result.sources.join(', ')}`);
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
    if (originalExt !== config.ext) {
      res.status(400).json({ error: `${fileType} must be a ${config.ext} file` });
      return;
    }

    fs.mkdirSync(DATA_DIR, { recursive: true });
    const storedPath = path.join(DATA_DIR, config.storedName);
    fs.writeFileSync(storedPath, req.file.buffer);

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

