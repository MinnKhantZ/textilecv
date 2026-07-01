import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import os from 'os';
import pc from 'picocolors';

type OsType = 'windows' | 'macos' | 'linux';

export function detectOs(): OsType {
  switch (process.platform) {
    case 'win32': return 'windows';
    case 'darwin': return 'macos';
    default: return 'linux';
  }
}

export function run(cmd: string, opts?: { stdio?: 'pipe' | 'inherit' }): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: opts?.stdio ?? 'pipe', timeout: 300_000 }).trim();
  } catch {
    return '';
  }
}

export function runQuiet(cmd: string): boolean {
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 300_000 });
    return true;
  } catch {
    return false;
  }
}

export function refreshWindowsPath(): void {
  if (process.platform !== 'win32') return;
  try {
    const machinePath = execSync(
      'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" /v Path',
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    const userPath = execSync(
      'reg query "HKCU\\Environment" /v Path',
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    const extract = (raw: string): string => {
      const m = raw.match(/Path\s+REG_(?:EXPAND_SZ|SZ)\s+(.*)/s);
      return m ? m[1].trim() : '';
    };
    const machine = extract(machinePath);
    const user = extract(userPath);
    if (machine || user) {
      process.env.PATH = [machine, user, process.env.PATH].filter(Boolean).join(';');
    }
  } catch { /* non-critical */ }
}

function findPythonPath(): string | null {
  const v = run('python --version') || run('python3 --version');
  if (v.startsWith('Python')) return 'python';

  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const home = process.env.USERPROFILE || '';
    const candidates = [
      join(localAppData, 'Programs', 'Python', 'Python313', 'python.exe'),
      join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe'),
      join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe'),
      join(home, 'AppData', 'Local', 'Programs', 'Python', 'Python313', 'python.exe'),
      'C:\\Python313\\python.exe',
      'C:\\Python312\\python.exe',
    ];
    for (const p of candidates) {
      if (existsSync(p)) {
        process.env.PATH = `${join(p, '..')};${process.env.PATH}`;
        return p;
      }
    }
  }
  return null;
}

export function findChromaPath(): string | null {
  refreshWindowsPath();

  if (run('chroma --version')) return 'chroma';

  // Try via Python scripts directory
  const pythonPath = findPythonPath();
  const pythonCmd = pythonPath || 'python';
  const scriptsDir = run(`${pythonCmd} -c "import sysconfig; print(sysconfig.get_path('scripts'))"`);
  if (scriptsDir) {
    const chromaPath = process.platform === 'win32'
      ? `${scriptsDir}\\chroma.exe`
      : `${scriptsDir}/chroma`;
    try {
      execSync(`"${chromaPath}" --version`, { stdio: 'pipe', timeout: 10000 });
      return chromaPath;
    } catch { /* not found */ }
  }

  // Fallback: common pip install locations on Windows
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const home = process.env.USERPROFILE || '';
    const candidates = [
      join(localAppData, 'Programs', 'Python', 'Python313', 'Scripts', 'chroma.exe'),
      join(localAppData, 'Programs', 'Python', 'Python312', 'Scripts', 'chroma.exe'),
      join(home, 'AppData', 'Local', 'Programs', 'Python', 'Python313', 'Scripts', 'chroma.exe'),
      'C:\\Python313\\Scripts\\chroma.exe',
      'C:\\Python312\\Scripts\\chroma.exe',
    ];
    for (const p of candidates) {
      if (existsSync(p)) {
        process.env.PATH = `${join(p, '..')};${process.env.PATH}`;
        return p;
      }
    }
  }

  return null;
}

export async function checkChromaRunning(port = 8000): Promise<boolean> {
  try {
    const http = await import('http');
    return await new Promise((resolve) => {
      const req = http.get(`http://localhost:${port}/api/v2/heartbeat`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve(data.includes('nanosecond')));
      });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => { req.destroy(); resolve(false); });
    });
  } catch {
    return false;
  }
}

export async function ensureChromaRunning(port = 8000): Promise<boolean> {
  if (await checkChromaRunning(port)) return true;

  const chromaPath = findChromaPath();
  if (!chromaPath) return false;

  console.log(pc.yellow('  ChromaDB is not running. Starting it in the background...'));

  // Persist the vector store under the user's config dir (~/.textilecv/chroma)
  // so it survives package upgrades and never leaks into the npm bundle.
  const chromaDataDir = join(os.homedir(), '.textilecv', 'chroma');
  mkdirSync(chromaDataDir, { recursive: true });

  try {
    const child = spawn(chromaPath, ['run', '--port', String(port), '--path', chromaDataDir], {
      detached: true,
      stdio: 'ignore',
      ...(process.platform === 'win32' ? { shell: true } : {}),
    });
    child.unref();
  } catch {
    // fallback to shell command
    if (process.platform === 'win32') {
      runQuiet(`start "" "${chromaPath}" run --port ${port} --path "${chromaDataDir}"`);
    } else {
      runQuiet(`nohup ${chromaPath} run --host 0.0.0.0 --port ${port} --path "${chromaDataDir}" > /dev/null 2>&1 &`);
    }
  }

  // Wait for server to be ready (up to 10 seconds)
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await checkChromaRunning(port)) {
      console.log(pc.green(`  ChromaDB started on port ${port}`));
      return true;
    }
  }

  console.log(pc.yellow('  ChromaDB may not have started. You can start it manually:'));
  console.log(pc.cyan('  chroma run --port 8000'));
  return false;
}
