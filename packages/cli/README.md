# textilecv

AI-powered career toolkit — tailor resumes, write cover letters, and generate STAR interview answers from your own experience data. Runs entirely on your machine.

## Install

```bash
# Global install
npm install -g textilecv

# Or run once without installing
npx textilecv start
```

> Requires **Node.js ≥ 20**. System dependencies (Python, ChromaDB, LaTeX) are installed automatically by `textilecv install`.

## Quick start

```bash
# 1. Install system dependencies (Python, ChromaDB, LaTeX)
textilecv install

# 2. Start the web interface
textilecv start
# → opens http://localhost:3001
```

On first launch the browser will ask you to **create a master password**. This unlocks an encrypted vault that stores your OpenAI API key (AES-256-GCM). Then:

1. Open the **Settings** tab and enter your OpenAI API key (saved encrypted).
2. Open the **Profile & Files** tab and upload your experience + about files.
3. Use **Resume Tailor**, **Cover Letter**, or **STAR Generator**.

## Commands

| Command | Description |
|---|---|
| `textilecv install` | Install Python, ChromaDB, and LaTeX |
| `textilecv start` | Start ChromaDB + the web interface |
| `textilecv start -p 8080` | Override the port for this session |
| `textilecv config --list` | Show current configuration |
| `textilecv config --set port 8080` | Set a config value |
| `textilecv config --get host` | Get a config value |
| `textilecv uninstall` | Remove TextileCV data and optionally system deps |
| `textilecv uninstall -y` | Skip prompts, uninstall everything |
| `textilecv uninstall --keep-data` | Keep config and data files |

## Where data is stored

Everything lives under `~/.textilecv/` (i.e. `C:\Users\<you>\.textilecv` on Windows), so it survives package upgrades:

| Path | Contents |
|---|---|
| `~/.textilecv/config.json` | Port, host, data directory |
| `~/.textilecv/.env` | Optional overrides (`CHROMA_URL`, `PORT`) |
| `~/.textilecv/data/` | SQLite database, uploaded/ingested markdown |
| `~/.textilecv/chroma/` | ChromaDB vector store |

The OpenAI API key is **not** stored in `.env` — it is encrypted with your master password and kept inside the SQLite database in `~/.textilecv/data/`. The vault locks on every server restart; unlock it in the browser to resume.

## Configuration

`~/.textilecv/config.json`:

```json
{
  "port": 3001,
  "host": "127.0.0.1",
  "dataDir": "~/.textilecv/data"
}
```

## License

MIT
