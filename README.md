# TextileCV

AI-powered career toolkit — tailor resumes, write cover letters, and generate STAR interview answers, all from your own experience data. Built with LangChain + OpenAI + ChromaDB + a LaTeX resume compiler.

![Node](https://img.shields.io/badge/node-%3E%3D20-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Resume Tailor** — Paste a job description, get a custom-tailored LaTeX resume matched to your real projects and skills.
- **Cover Letter Architect** — Narrative-driven cover letters that map your background to the role.
- **STAR Generator** — Behavioral interview answers built from your actual experience.
- **LaTeX PDF Compilation** — Server-side `pdflatex` compilation with fallback template repair.
- **RAG Pipeline** — Chunked markdown ingested into ChromaDB, retrieved via MMR for diverse, relevant context.
- **Profile Manager** — Upload files (PDF, DOCX, TXT), view generation history, manage preferences.
- **Encrypted Vault** — Your OpenAI API key is encrypted at rest (AES-256-GCM) with a master password and stored locally; it never leaves your machine.
- **CLI** — Install dependencies, start the server, and manage config from the terminal.

## Architecture

```
textilecv-monorepo/
├── packages/
│   ├── server/        # Express API + LangChain + ChromaDB + LaTeX
│   ├── client/        # React + Vite + Tailwind SPA
│   └── cli/           # Commander.js CLI (bundles server+client for production)
├── scripts/           # Build scripts (copy dist into CLI bundle)
├── package.json       # npm workspaces root
└── README.md
```

- **Development**: run server and client separately with hot-reload.
- **Production**: CLI bundles server and client dist, serves the SPA from a single Express process.

## Prerequisites

| Dependency | Purpose | Auto-installed by CLI? |
|---|---|---|
| Node.js ≥ 20 | Runtime | No |
| npm ≥ 10 | Package manager | No |
| Python 3 | ChromaDB runtime | Yes (`textilecv install`) |
| ChromaDB | Vector store | Yes (`textilecv install`) |
| MiKTeX / TeX Live | LaTeX PDF compilation | Yes (`textilecv install`) |
| OpenAI API Key | Embeddings + chat | No (set via the in-app Settings / encrypted vault) |

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url> && cd textilecv-monorepo
npm install

# 2. Install system dependencies (ChromaDB, Python, LaTeX)
npx textilecv install

# 3. Start the web interface
npx textilecv start
# → opens http://localhost:3001
```

On first launch the browser asks you to **create a master password** (this encrypts your API key at rest). Then set your OpenAI key in the **Settings** tab and upload your experience files in the **Profile & Files** tab.

## Development

Two terminals:

```bash
# Terminal 1 — API server (port 3001, hot-reload)
npm run dev:server

# Terminal 2 — Vite dev server (port 5173, hot-reload)
npm run dev:client
```

The Vite dev server proxies `/generate-*`, `/uploads`, `/logs`, `/profile`, `/vault`, `/settings`, and `/health` to `localhost:3001`.

### Data Files

Place your experience data in `packages/server/data/` (in development) — in production this lives at `~/.textilecv/data/`:

| File | Purpose |
|---|---|
| `master_experience.md` | Your projects, skills, work history (markdown, split on `#` headers) |
| `about.md` | Optional personal summary, preferences, career goals |

Uploading files through the web interface automatically re-ingests them into ChromaDB — there is no separate manual ingestion step.

### API Key & Vault

The OpenAI API key is stored encrypted (AES-256-GCM) inside the SQLite database and unlocked with a master password set on first launch. Set and manage it from the **Settings** tab in the web UI (works in both dev and production).

### Environment Variables (optional)

`packages/server/.env` (dev) or `~/.textilecv/.env` (production) — all optional:

```env
CHROMA_URL=http://localhost:8000  # ChromaDB endpoint
PORT=3001                        # API server port
ALLOWED_ORIGINS=http://localhost:5173  # Comma-separated CORS origins
```

## CLI Commands

```bash
textilecv install          # Install Python, ChromaDB, LaTeX
textilecv start            # Start ChromaDB + Express server + SPA
textilecv start -p 8080    # Override port for this session
textilecv config --list    # Show current config
textilecv config --set port 8080
textilecv config --get host
textilecv uninstall        # Remove TextileCV data (prompts for Python/ChromaDB/LaTeX)
textilecv uninstall -y     # Skip prompts, uninstall everything
textilecv uninstall --keep-data  # Keep config and data files
```

Config is stored at `~/.textilecv/config.json`. All user data (SQLite DB, uploads, ChromaDB vector store) lives under `~/.textilecv/`.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/vault/status` | Vault setup/unlock state (public) |
| `POST` | `/vault/setup` | Create master password (first launch) |
| `POST` | `/vault/unlock` | Unlock the vault |
| `POST` | `/vault/lock` | Lock the vault |
| `POST` | `/vault/change-password` | Change master password |
| `GET` | `/settings` | AI settings (key redacted) |
| `PATCH` | `/settings` | Update AI provider/model/base URL/key |
| `POST` | `/settings/ai/test` | Test the configured API key |
| `POST` | `/generate-resume` | Tailor resume to a job description |
| `GET` | `/generate-resume/pdf/:id` | Download compiled PDF |
| `GET` | `/generate-resume/source/:id` | Download raw LaTeX |
| `POST` | `/generate-cover-letter` | Generate cover letter |
| `POST` | `/generate-star-answers` | Generate STAR answers for questions |
| `POST` | `/uploads/:fileType` | Upload a file (PDF, DOCX, TXT) |
| `GET` | `/uploads/status` | Upload + ingest status |
| `GET` | `/logs` | Generation history |
| `GET` | `/health` | Health check |

## Build

```bash
# Full production build (client → server → CLI bundle)
npm run build
```

This compiles the client, copies dist into the CLI package, compiles the server, copies dist into the CLI package, then compiles the CLI. To publish the CLI to npm:

```bash
npm run publish:cli   # builds, then npm publish -w packages/cli
```

## Tech Stack

- **Runtime**: Node.js, Express, TypeScript (ESM)
- **AI**: LangChain.js, OpenAI (`gpt-5.4-mini`, `text-embedding-3-small`)
- **Vector Store**: ChromaDB (Python, external)
- **LaTeX**: `node-latex` + `pdflatex` (MiKTeX / TeX Live)
- **Database**: `sql.js` (SQLite WASM) for generation logs, preferences, and the encrypted vault
- **Client**: React 18, Vite, Tailwind CSS
- **CLI**: Commander.js, picocolors
- **Security**: AES-256-GCM vault (Node `crypto`) for API-key encryption at rest

## License

MIT
