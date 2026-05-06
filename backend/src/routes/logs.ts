import { Router, Request, Response } from 'express';
import { getGenerationLogs, getAllPreferences, setPreference } from '../lib/db';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const limitParam = req.query.limit;
    const limit = typeof limitParam === 'string' && /^\d+$/.test(limitParam)
      ? Math.min(parseInt(limitParam, 10), 200)
      : 50;

    const logs = await getGenerationLogs(limit);

    // Parse questions JSON field for cleaner API output
    const formatted = logs.map((log) => ({
      ...log,
      questions: log.questions ? (JSON.parse(log.questions) as string[]) : null,
      // Strip bulk output_text from list view; expose via detail endpoint if needed
      output_text: log.output_text ? log.output_text.slice(0, 300) + (log.output_text.length > 300 ? '…' : '') : null,
    }));

    res.json(formatted);
  } catch (error: unknown) {
    console.error('[/logs] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch logs' });
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
