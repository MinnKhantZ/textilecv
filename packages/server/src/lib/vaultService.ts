import crypto, { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

let encryptionKey: Buffer | null = null;

export function isVaultUnlocked(): boolean {
  return encryptionKey !== null;
}

export function lockVault(): void {
  encryptionKey = null;
}

export function getEncryptionKey(): Buffer {
  if (!encryptionKey) {
    throw new Error('Vault is locked. Unlock it in the web interface.');
  }
  return encryptionKey;
}

export function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

export function hashPassword(password: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, 'hex');
  return scryptSync(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString('hex');
}

export function verifyPassword(password: string, saltHex: string, verifierHex: string): boolean {
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const verifier = Buffer.from(verifierHex, 'hex');
    const test = scryptSync(password, salt, 64, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
    return verifier.length === test.length && timingSafeEqual(verifier, test);
  } catch {
    return false;
  }
}

export function deriveEncryptionKey(password: string, saltHex: string): Buffer {
  const salt = Buffer.from(saltHex, 'hex');
  return scryptSync(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
}

export function unlockWithPassword(password: string, saltHex: string, verifierHex: string): boolean {
  if (!verifyPassword(password, saltHex, verifierHex)) return false;
  encryptionKey = deriveEncryptionKey(password, saltHex);
  return true;
}

export function setupVaultPassword(password: string, saltHex: string): { verifier: string; key: Buffer } {
  const verifier = hashPassword(password, saltHex);
  const key = deriveEncryptionKey(password, saltHex);
  encryptionKey = key;
  return { verifier, key };
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decrypt(ciphertextB64: string): string {
  const key = getEncryptionKey();
  const blob = Buffer.from(ciphertextB64, 'base64');
  const iv = blob.subarray(0, IV_LENGTH);
  const authTag = blob.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = blob.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function encryptJson(obj: unknown): string {
  return encrypt(JSON.stringify(obj));
}

export function decryptJson<T>(ciphertextB64: string): T {
  return JSON.parse(decrypt(ciphertextB64)) as T;
}
