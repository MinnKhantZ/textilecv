import { readConfig, writeConfig } from '../config.js';

interface ConfigOptions {
  list?: boolean;
  get?: string;
  set?: [string, string];
}

export function config(opts: ConfigOptions): void {
  const cfg = readConfig();

  if (opts.set) {
    const [key, value] = opts.set;
    if (key === 'port') {
      cfg.port = Number(value);
    } else if (key === 'host') {
      cfg.host = value;
    } else if (key === 'dataDir') {
      cfg.dataDir = value;
    } else {
      console.error(`  Unknown config key: "${key}". Valid keys: port, host, dataDir`);
      return;
    }
    writeConfig(cfg);
    console.log(`  Set ${key} = ${value}`);
    return;
  }

  if (opts.get) {
    const val = (cfg as unknown as Record<string, unknown>)[opts.get];
    if (val !== undefined) {
      console.log(`  ${opts.get} = ${val}`);
    } else {
      console.error(`  Unknown config key: "${opts.get}"`);
    }
    return;
  }

  // Default: list all
  console.log('\n  TextileCV Configuration:');
  console.log('  ' + '─'.repeat(40));
  console.log(`  port    = ${cfg.port}`);
  console.log(`  host    = ${cfg.host}`);
  console.log(`  dataDir = ${cfg.dataDir}`);
  console.log();
}
