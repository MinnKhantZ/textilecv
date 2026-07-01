import { Request, Response, NextFunction } from 'express';
import { isVaultSetup } from '../lib/db.js';
import { isVaultUnlocked } from '../lib/vaultService.js';

/**
 * Blocks a request unless the vault has been set up AND unlocked.
 * - 403 if no master password has been set yet (vault not setup).
 * - 423 if setup exists but the vault is locked (server restart / lock).
 */
export async function requireVaultUnlocked(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const setup = await isVaultSetup();
    if (!setup) {
      res.status(403).json({ error: 'Vault not set up. Create a master password first.' });
      return;
    }
    if (!isVaultUnlocked()) {
      res.status(423).json({ error: 'Vault is locked. Unlock it to continue.' });
      return;
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Vault check failed' });
  }
}
