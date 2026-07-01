import { Command } from 'commander';
import { studio } from '../commands/start.js';
import { config } from '../commands/config.js';
import { install } from '../commands/install.js';
import { uninstall } from '../commands/uninstall.js';

const program = new Command();

program
  .name('textilecv')
  .description('TextileCV — AI-powered career toolkit')
  .version('1.0.0');

program
  .command('install')
  .description('Install system dependencies (Python, ChromaDB, LaTeX)')
  .action(async () => {
    try {
      await install();
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Remove TextileCV data and optionally system dependencies')
  .option('-y, --yes', 'Skip confirmation prompts and uninstall everything')
  .option('--keep-data', 'Keep TextileCV config and data files')
  .action(async (opts) => {
    try {
      await uninstall(opts);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start the TextileCV web interface')
  .option('-p, --port <port>', 'Override configured port for this session')
  .action(async (options) => {
    try {
      await studio(options);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

program
  .command('config')
  .description('View or set TextileCV configuration')
  .option('-g, --get <key>', 'Get a config value')
  .option('-s, --set <key> <value>', 'Set a config value')
  .option('-l, --list', 'List all config values')
  .action((opts) => {
    try {
      config(opts);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

program.parse();
