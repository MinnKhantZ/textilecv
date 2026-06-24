import fs from 'fs';
import path from 'path';
import os from 'os';

export interface TextileCVConfig {
  port: number;
  host: string;
  dataDir: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.textilecv');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export const DEFAULT_CONFIG: TextileCVConfig = {
  port: 3001,
  host: '127.0.0.1',
  dataDir: path.join(CONFIG_DIR, 'data'),
};

export function readConfig(): TextileCVConfig {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeConfig(config: TextileCVConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', 'utf8');
}
