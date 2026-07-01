import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import pc from 'picocolors';

// ── Helpers ────────────────────────────────────────────────────────────────

function header(text: string): void {
  console.log(pc.bold(pc.cyan(`\n▸ ${text}`)));
}

function success(text: string): void {
  console.log(pc.green(`  ✓ ${text}`));
}

function warn(text: string): void {
  console.log(pc.yellow(`  ! ${text}`));
}

function fail(text: string): void {
  console.log(pc.red(`  ✗ ${text}`));
}

function info(text: string): void {
  console.log(`  ${text}`);
}

function run(cmd: string): boolean {
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 300_000 });
    return true;
  } catch {
    return false;
  }
}

function runQuiet(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', timeout: 300_000 }).trim();
  } catch {
    return '';
  }
}

function refreshWindowsPath(): void {
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

function prompt(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(pc.cyan(`  ${question} (y/N) `), (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

// ── Paths ──────────────────────────────────────────────────────────────────

const TEXTILECV_CONFIG_DIR = path.join(os.homedir(), '.textilecv');

function removeDir(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) return false;
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

// ── ChromaDB ───────────────────────────────────────────────────────────────

async function stopChromaServer(port = 8000): Promise<void> {
  if (process.platform === 'win32') {
    // Find and kill processes listening on the ChromaDB port
    const result = runQuiet(`netstat -ano | findstr :${port}`);
    const lines = result.split('\n').filter((l) => l.includes('LISTENING'));
    for (const line of lines) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && pid !== '0') {
        runQuiet(`taskkill /PID ${pid} /F`);
      }
    }
  } else {
    runQuiet(`lsof -ti:${port} | xargs kill -9 2>/dev/null`);
  }
}

async function deleteChromaCollection(port = 8000): Promise<void> {
  try {
    const http = await import('http');
    await new Promise<void>((resolve) => {
      const req = http.request(
        `http://localhost:${port}/api/v1/collections/textilecv`,
        { method: 'DELETE' },
        (res) => {
          res.resume();
          res.on('end', resolve);
        }
      );
      req.on('error', () => resolve());
      req.setTimeout(3000, () => { req.destroy(); resolve(); });
      req.end();
    });
  } catch { /* collection may not exist */ }
}

// ── System dependency checks ──────────────────────────────────────────────

function isPythonInstalled(): boolean {
  const v = runQuiet('python --version') || runQuiet('python3 --version');
  return v.startsWith('Python');
}

function isChromadbInstalled(): boolean {
  const v = runQuiet('pip show chromadb');
  return v.includes('Name: chromadb');
}

function isLatexInstalled(): boolean {
  return run('pdflatex --version');
}

// ── Main ───────────────────────────────────────────────────────────────────

interface UninstallOptions {
  yes?: boolean;
  keepData?: boolean;
}

export async function uninstall(options: UninstallOptions = {}): Promise<void> {
  console.log(pc.bold(pc.cyan('\n  TextileCV — Uninstall\n')));

  const skipPrompts = options.yes === true;

  // ── 1. Stop ChromaDB server ─────────────────────────────────────────────
  header('Stopping ChromaDB server');
  await stopChromaServer();
  success('ChromaDB server stopped');

  // ── 2. Delete ChromaDB collection ───────────────────────────────────────
  header('Deleting ChromaDB collection');
  await deleteChromaCollection();
  success('Collection "textilecv" deleted');

  // ── 3. Delete TextileCV data ────────────────────────────────────────────
  if (options.keepData) {
    info('Skipping data deletion (--keep-data)');
  } else {
    header('Deleting TextileCV data');

    if (fs.existsSync(TEXTILECV_CONFIG_DIR)) {
      removeDir(TEXTILECV_CONFIG_DIR);
      success(`Deleted ${TEXTILECV_CONFIG_DIR}`);
      info('  (includes config.json, .env, data/, and chroma/ vector store)');
    } else {
      info('No data files to delete');
    }
  }

  // ── 4. System dependencies ──────────────────────────────────────────────
  header('System dependencies');
  info('The following were installed by "textilecv install":');
  info('You can choose to remove them.\n');
  info('ChromaDB is asked first because uninstalling Python removes it too.\n');

  // ChromaDB (ask first — Python removal kills it)
  if (isChromadbInstalled()) {
    const removeChroma = skipPrompts || await prompt('Uninstall ChromaDB (pip package)?');
    if (removeChroma) {
      info('Uninstalling ChromaDB...');
      const pip = runQuiet('pip --version') ? 'pip' : 'pip3';
      run(`${pip} uninstall chromadb -y`);
      if (!isChromadbInstalled()) {
        success('ChromaDB uninstalled');
      } else {
        warn('ChromaDB may still be installed — check manually');
      }
    } else {
      info('Keeping ChromaDB');
    }
  } else {
    info('ChromaDB not installed — skipping');
  }

  // Python
  if (isPythonInstalled()) {
    const removePython = skipPrompts || await prompt('Uninstall Python?');
    if (removePython) {
      info('Uninstalling Python...');
      if (process.platform === 'win32') {
        run('winget uninstall Python.Python.3.12 --accept-source-agreements');
        refreshWindowsPath();
      } else if (process.platform === 'darwin') {
        warn('Please uninstall Python manually or via Homebrew: brew uninstall python');
      } else {
        warn('Please uninstall Python manually: sudo apt remove python3');
      }
      if (!isPythonInstalled()) {
        success('Python uninstalled');
      } else {
        warn('Python may still be installed — check manually');
      }
    } else {
      info('Keeping Python');
    }
  } else {
    info('Python not installed — skipping');
  }

  // LaTeX
  if (isLatexInstalled()) {
    const removeLatex = skipPrompts || await prompt('Uninstall LaTeX (MiKTeX/Tex Live)?');
    if (removeLatex) {
      info('Uninstalling LaTeX...');
      if (process.platform === 'win32') {
        run('winget uninstall MiKTeX.MiKTeX --accept-source-agreements');
        refreshWindowsPath();
      } else if (process.platform === 'darwin') {
        warn('Please uninstall MacTeX manually or via Homebrew: brew uninstall --cask mactex-no-gui');
      } else {
        warn('Please uninstall TeX Live manually: sudo apt remove texlive-latex-base');
      }
      if (!isLatexInstalled()) {
        success('LaTeX uninstalled');
      } else {
        warn('LaTeX may still be installed — check manually');
      }
    } else {
      info('Keeping LaTeX');
    }
  } else {
    info('LaTeX not installed — skipping');
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(pc.bold(pc.cyan('\n  ── Summary ──\n')));
  success('TextileCV data cleaned up');
  success('ChromaDB collection deleted');
  success('ChromaDB server stopped');
  console.log(pc.bold(pc.green('\n  TextileCV has been uninstalled.\n')));
}
