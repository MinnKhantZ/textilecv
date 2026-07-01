import { Router, Request, Response } from 'express';
import { HumanMessage } from '@langchain/core/messages';
import { getPublicAiSettings, saveAiSettings } from '../lib/db.js';
import { getChatModel } from '../lib/llm.js';

const router = Router();

// GET /settings — returns AI settings with the API key redacted (hasApiKey only).
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const ai = await getPublicAiSettings();
    res.json({ success: true, settings: { ai } });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to read settings' });
  }
});

// PATCH /settings — update AI settings. `apiKey` is encrypted when provided
// (non-empty), cleared when null/empty, and left unchanged when omitted.
router.patch('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ai } = req.body as {
      ai?: { provider?: unknown; model?: unknown; baseUrl?: unknown; apiKey?: unknown };
    };

    const patch: { provider?: string; model?: string; baseUrl?: string; apiKey?: string | null } = {};
    if (typeof ai?.provider === 'string') patch.provider = ai.provider;
    if (typeof ai?.model === 'string') patch.model = ai.model;
    if (typeof ai?.baseUrl === 'string') patch.baseUrl = ai.baseUrl;
    if (ai?.apiKey !== undefined) {
      patch.apiKey = typeof ai.apiKey === 'string' ? ai.apiKey : null;
    }

    await saveAiSettings(patch);
    const updated = await getPublicAiSettings();
    res.json({ success: true, settings: { ai: updated } });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save settings' });
  }
});

// POST /settings/ai/test — verifies the configured key/model can reach the API.
router.post('/ai/test', async (_req: Request, res: Response): Promise<void> => {
  try {
    const llm = await getChatModel({ temperature: 0 });
    const result = await llm.invoke([new HumanMessage('Reply with exactly: OK')]);
    const text = typeof result === 'string' ? result : result.content;
    res.json({ success: true, message: `Connection successful. Model replied: ${String(text).slice(0, 50)}` });
  } catch (err) {
    res.status(200).json({
      success: false,
      message: err instanceof Error ? err.message : 'Connection failed',
    });
  }
});

export default router;
