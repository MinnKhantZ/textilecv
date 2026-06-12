import { Router, Request, Response } from 'express';
import { getGenerationLogs, getGenerationLogById, getAllPreferences, setPreference } from '../lib/db';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const limitParam = req.query.limit;
    const limit = typeof limitParam === 'string' && /^\d+$/.test(limitParam)
      ? Math.min(parseInt(limitParam, 10), 200)
      : 50;

    const logs = await getGenerationLogs(limit);

    // Return only metadata — no output_text — for the list view
    const formatted = logs.map((log) => ({
      id: log.id,
      type: log.type,
      job_description: log.job_description,
      questions: log.questions ? (JSON.parse(log.questions) as string[]) : null,
      compatible: log.compatible,
      generated_at: log.generated_at,
      preferences: log.preferences,
    }));

    res.json(formatted);
  } catch (error: unknown) {
    console.error('[/logs] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch logs' });
  }
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid log id' });
      return;
    }

    const log = await getGenerationLogById(id);
    if (!log) {
      res.status(404).json({ error: 'Log entry not found' });
      return;
    }

    res.json({
      ...log,
      questions: log.questions ? (JSON.parse(log.questions) as string[]) : null,
    });
  } catch (error: unknown) {
    console.error('[/logs/:id] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch log detail' });
  }
});

// ── Preferences ───────────────────────────────────────────────────────────────

router.get('/preferences', async (_req: Request, res: Response): Promise<void> => {
  try {
    const prefs = await getAllPreferences();
    res.json(prefs);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch preferences' });
  }
});

router.put('/preferences/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params as { key: string };
    const { value } = req.body as { value?: unknown };

    if (key.length > 100) {
      res.status(400).json({ error: 'Preference key too long (max 100 chars)' });
      return;
    }
    if (typeof value !== 'string') {
      res.status(400).json({ error: 'value must be a string' });
      return;
    }
    if (value.length > 5000) {
      res.status(400).json({ error: 'Preference value too long (max 5000 chars)' });
      return;
    }

    await setPreference(key, value);
    res.json({ key, value });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save preference' });
  }
});

export default router;
