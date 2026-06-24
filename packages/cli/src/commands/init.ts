import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, '../../../server');

export async function init(): Promise<void> {
  console.log('\n  TextileCV — Initial Setup\n');

  const dataDir = path.join(SERVER_ROOT, 'data');
  const samplesDir = path.join(SERVER_ROOT, 'samples');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const sampleFiles = ['master_experience.md', 'about.md'];
  let copied = 0;

  for (const file of sampleFiles) {
    const target = path.join(dataDir, file);
    const source = path.join(samplesDir, file);
    if (!fs.existsSync(target) && fs.existsSync(source)) {
      fs.copyFileSync(source, target);
      console.log(`  Copied ${file} to data/`);
      copied++;
    } else if (fs.existsSync(target)) {
      console.log(`  ${file} already exists — skipping`);
    } else {
      console.log(`  Warning: ${file} not found in samples/`);
    }
  }

  if (copied > 0) {
    console.log('\n  Running initial data ingestion into ChromaDB...');
    try {
      execSync('npx tsx src/ingest.ts', {
        cwd: SERVER_ROOT,
        stdio: 'inherit',
      });
      console.log('  Data ingestion complete!\n');
    } catch {
      console.error('\n  Ingestion failed. Make sure ChromaDB is running on http://localhost:8000');
      console.error('  You can run ingestion later with: npm run ingest\n');
    }
  } else {
    console.log('\n  No new files to copy. Run "npm run ingest" to re-ingest data.\n');
  }
}
