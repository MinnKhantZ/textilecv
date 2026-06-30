import { Router, Request, Response } from 'express';
import { getProfileData, setPreference, getPreference } from '../lib/db.js';
import { profileSchema, emptyProfile, profileTypeSchema, type ProfileType } from '../lib/profileSchema.js';
import { evaluateCompleteness } from '../lib/completeness.js';

const router = Router();

/**
 * GET /profile
 * Returns the structured profile, completeness report, and current profile type.
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    let profile = emptyProfile();
    try {
      const json = await getProfileData();
      if (json) {
        const parsed = profileSchema.safeParse(JSON.parse(json));
        if (parsed.success) profile = parsed.data;
      }
    } catch {
      // profile may not exist yet
    }

    const profileTypeRaw = await getPreference('profile_type');
    const profileType = profileTypeRaw ?? profile.profileType ?? 'other';
    const completeness = evaluateCompleteness(profile);

    res.json({ profile, completeness, profileType });
  } catch (error: unknown) {
    console.error('[/profile GET] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch profile' });
  }
});

/**
 * PUT /profile/type
 * Sets the user's self-declared profile type (student, engineering, design, etc.)
 */
router.put('/type', async (req: Request, res: Response): Promise<void> => {
  try {
    const { profileType } = req.body as { profileType?: unknown };

    if (typeof profileType !== 'string') {
      res.status(400).json({ error: 'profileType must be a string' });
      return;
    }

    const parsed = profileTypeSchema.safeParse(profileType);
    if (!parsed.success) {
      res.status(400).json({
        error: `Invalid profileType. Valid values: ${profileTypeSchema.options.join(', ')}`,
      });
      return;
    }

    await setPreference('profile_type', parsed.data as ProfileType);
    res.json({ profileType: parsed.data, message: 'Profile type updated.' });
  } catch (error: unknown) {
    console.error('[/profile/type PUT] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to set profile type' });
  }
});

export default router;
