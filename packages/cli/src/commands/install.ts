import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import pc from 'picocolors';
import { detectOs, run, runQuiet, refreshWindowsPath, findChromaPath } from '../chroma.js';

type OsType = 'windows' | 'macos' | 'linux';

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

// ── Helpers ────────────────────────────────────────────────────────────────

function checkChromaRunning(): boolean {
  try {
    const res = run('python -c "import httpx; r = httpx.get(\'http://localhost:8000/api/v2/heartbeat\'); print(r.text)"');
    return res.includes('nanosecond');
  } catch {
    return false;
  }
}

// ── Python ─────────────────────────────────────────────────────────────────

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
      if (existsSync(p)) return p;
    }
  }
  return null;
}

function checkPython(): boolean {
  const v = run('python --version') || run('python3 --version');
  if (v.startsWith('Python')) return true;

  const found = findPythonPath();
  if (found && found !== 'python') {
    const dir = dirname(found);
    process.env.PATH = `${dir};${process.env.PATH}`;
    return true;
  }
  return false;
}

function installPython(os: OsType): boolean {
  header('Installing Python 3');
  switch (os) {
    case 'windows': {
      info('Downloading Python installer...');
      const ok = runQuiet('winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements');
      if (!ok) {
        info('winget failed. Trying with --silent...');
        runQuiet('winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements');
      }
      refreshWindowsPath();
      return checkPython();
    }
    case 'macos':
      if (runQuiet('brew --version')) {
        info('Using Homebrew...');
        return runQuiet('brew install python3');
      }
      warn('Homebrew not found. Install from https://brew.sh');
      return false;
    case 'linux':
      info('Attempting sudo apt install...');
      return runQuiet('sudo apt-get update -qq && sudo apt-get install -y -qq python3 python3-pip python3-venv');
    default:
      return false;
  }
}

// ── ChromaDB ───────────────────────────────────────────────────────────────

function checkChromadb(): boolean {
  const v = run('chroma --version') || run('python -m chromadb.cli.cli --version');
  if (v.includes('chroma') || /\d+\.\d+/.test(v)) return true;
  const pyCheck = run('python -c "import chromadb; print(chromadb.__version__)"');
  return /\d+\.\d+/.test(pyCheck);
}

function installChromadb(): boolean {
  header('Installing ChromaDB (Python package)');
  refreshWindowsPath();
  const pip = run('pip --version') ? 'pip' : 'pip3';
  if (!runQuiet(`${pip} --version`)) {
    fail('pip not available. Install Python first.');
    return false;
  }
  info(`Using ${pip}...`);
  const ok = runQuiet(`${pip} install chromadb`);
  if (ok) success('ChromaDB installed');
  return ok;
}

// ── LaTeX ──────────────────────────────────────────────────────────────────

function checkLatex(): boolean {
  return runQuiet('pdflatex --version');
}

function installLatex(os: OsType): boolean {
  header('Installing LaTeX (pdflatex)');
  switch (os) {
    case 'windows': {
      info('Attempting MiKTeX install via winget...');
      runQuiet('winget install MiKTeX.MiKTeX --accept-package-agreements --accept-source-agreements');

      info('Waiting for MiKTeX GUI installer to finish (this may take a few minutes)...');

      for (let i = 0; i < 60; i++) {
        refreshWindowsPath();
        if (checkLatex()) {
          success('MiKTeX installed');
          return true;
        }
        const localAppData = process.env.LOCALAPPDATA || '';
        const miktexPath = join(localAppData, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', 'pdflatex.exe');
        if (existsSync(miktexPath)) {
          const dir = dirname(miktexPath);
          process.env.PATH = `${dir};${process.env.PATH}`;
          success('MiKTeX installed');
          return true;
        }
        if (i % 6 === 0) info('  still waiting...');
        execSync('timeout /t 5 >nul 2>&1 || ping -n 6 127.0.0.1 >nul 2>&1', { stdio: 'pipe', timeout: 10000 });
      }

      warn('MiKTeX installer may still be running. Check if pdflatex works by running: pdflatex --version');
      return false;
    }
    case 'macos': {
      if (runQuiet('brew --version')) {
        info('Using Homebrew to install MacTeX (this may take a while)...');
        const ok = runQuiet('brew install --cask mactex-no-gui');
        if (ok) success('MacTeX installed');
        return ok;
      }
      warn('Homebrew not found. Install from https://brew.sh');
      return false;
    }
    case 'linux':
      info('Attempting sudo apt install texlive-latex-base...');
      if (runQuiet('sudo apt-get update -qq && sudo apt-get install -y -qq texlive-latex-base texlive-latex-extra texlive-fonts-recommended texlive-fonts-extra')) {
        success('TeX Live installed');
        return true;
      }
      warn('apt install failed. Try: sudo apt install texlive-latex-base');
      return false;
    default:
      return false;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

export async function install(): Promise<void> {
  console.log(pc.bold(pc.cyan('\n  TextileCV — System Setup\n')));

  refreshWindowsPath();

  const os = detectOs();
  info(`Detected OS: ${os}\n`);

  const results: { name: string; ok: boolean; needed: boolean }[] = [];

  // 1. Python
  const pythonOk = checkPython();
  if (pythonOk) {
    success('Python is already installed');
    results.push({ name: 'Python', ok: true, needed: false });
  } else {
    warn('Python not found');
    const installed = installPython(os);
    results.push({ name: 'Python', ok: installed, needed: true });
    if (!installed) {
      fail('Python installation failed. Install manually from https://python.org');
      info('After installing, re-run: textilecv install');
      return;
    }
  }

  // 2. ChromaDB
  const chromaOk = checkChromadb();
  if (chromaOk) {
    success('ChromaDB is already installed');
    results.push({ name: 'ChromaDB', ok: true, needed: false });
  } else {
    warn('ChromaDB not found');
    const installed = installChromadb();
    results.push({ name: 'ChromaDB', ok: installed, needed: true });
    if (!installed) {
      fail('ChromaDB installation failed. Install manually: pip install chromadb');
    }
  }

  // 3. LaTeX
  const latexOk = checkLatex();
  if (latexOk) {
    success('LaTeX (pdflatex) is already installed');
    results.push({ name: 'LaTeX', ok: true, needed: false });
  } else {
    warn('LaTeX not found');
    const installed = installLatex(os);
    results.push({ name: 'LaTeX', ok: installed, needed: true });
    if (!installed) {
      warn('LaTeX installation failed. Resume PDF generation will not work without it.');
      info('Install manually from https://www.tug.org/texlive/ or https://miktex.org/download');
    }
  }

  // 4. Start ChromaDB if installed but not running
  if (checkChromadb()) {
    header('Checking ChromaDB server');
    if (checkChromaRunning()) {
      success('ChromaDB server is already running');
    } else {
      info('Starting ChromaDB server in background...');
      const chromaPath = findChromaPath();
      if (chromaPath) {
        try {
          const child = spawn(chromaPath, ['run', '--port', '8000'], {
            detached: true,
            stdio: 'ignore',
            ...(process.platform === 'win32' ? { shell: true } : {}),
          });
          child.unref();
        } catch {
          if (os === 'windows') {
            runQuiet(`start "" "${chromaPath}" run --port 8000`);
          } else {
            runQuiet('nohup chroma run --host 0.0.0.0 --port 8000 > /dev/null 2>&1 &');
          }
        }
        await new Promise((r) => setTimeout(r, 5000));
        if (checkChromaRunning()) {
          success('ChromaDB server started on port 8000');
        } else {
          warn('ChromaDB server may need manual start. Open a separate terminal and run:');
          info('  chroma run --port 8000');
        }
      } else {
        warn('Could not find chroma executable. Start manually:');
        info('  chroma run --port 8000');
      }
    }
  }

  // Summary
  console.log(pc.bold(pc.cyan('\n  ── Summary ──\n')));
  for (const r of results) {
    const icon = r.ok ? pc.green('✓') : pc.red('✗');
    const status = r.needed ? (r.ok ? pc.green(' installed') : pc.red(' FAILED')) : pc.green(' already installed');
    console.log(`  ${icon} ${r.name}${status}`);
  }

  const allOk = results.every((r) => r.ok);
  if (allOk) {
    console.log(pc.bold(pc.green('\n  All dependencies are ready!')));
    console.log(pc.cyan('  Next steps:'));
    info('Run "textilecv init" to set up sample data');
    info('Run "textilecv start" to launch the web interface\n');
  } else {
    console.log(pc.yellow('\n  Some dependencies failed to install.'));
    console.log(pc.yellow('  Install them manually and re-run: textilecv install\n'));
  }
}
