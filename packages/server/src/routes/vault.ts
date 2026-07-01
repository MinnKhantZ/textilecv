import { Router, Request, Response } from 'express';
import {
  isVaultSetup,
  getVaultMeta,
  setupVault,
  changeMasterPassword,
} from '../lib/db.js';
import { isVaultUnlocked, unlockWithPassword, lockVault } from '../lib/vaultService.js';

const router = Router();

// GET /vault/status — public (works while locked); used by the client to
// decide whether to show the setup, unlock, or main screen.
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const isSetup = await isVaultSetup();
    res.json({ success: true, isSetup, isUnlocked: isVaultUnlocked() });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to read vault status' });
  }
});

// POST /vault/setup — first-launch: create the master password.
router.post('/setup', async (req: Request, res: Response): Promise<void> => {
  try {
    if (await isVaultSetup()) {
      res.status(400).json({ error: 'Vault is already set up.' });
      return;
    }
    const { password } = req.body as { password?: unknown };
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' });
      return;
    }
    await setupVault(password);
    res.json({ success: true, isUnlocked: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to set up vault' });
  }
});

// POST /vault/unlock — unlock with the master password.
router.post('/unlock', async (req: Request, res: Response): Promise<void> => {
  try {
    const meta = await getVaultMeta();
    if (!meta) {
      res.status(400).json({ error: 'Vault is not set up yet.' });
      return;
    }
    const { password } = req.body as { password?: unknown };
    if (typeof password !== 'string' || !password) {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }
    const ok = unlockWithPassword(password, meta.salt, meta.verifier);
    if (!ok) {
      res.status(401).json({ error: 'Invalid password.' });
      return;
    }
    res.json({ success: true, isUnlocked: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to unlock vault' });
  }
});

// POST /vault/lock — lock the vault (drops the in-memory key).
router.post('/lock', (_req: Request, res: Response): void => {
  lockVault();
  res.json({ success: true, isUnlocked: false });
});

// POST /vault/change-password — re-encrypt all secrets under a new key.
router.post('/change-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword?: unknown; newPassword?: unknown };
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      res.status(400).json({ error: 'currentPassword and newPassword are required.' });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }
    const ok = await changeMasterPassword(currentPassword, newPassword);
    if (!ok) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to change password' });
  }
});

export default router;
