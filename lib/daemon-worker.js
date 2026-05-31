import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { GLOBAL_LOG_DIR, loadGlobalConfig } from './config.js';
import { runCli } from './cli.js';

const intervalMs = Number(process.argv[2] ?? 3600000);

async function log(message) {
  await mkdir(GLOBAL_LOG_DIR, { recursive: true });
  const line = `[${new Date().toISOString()}] ${message}\n`;
  await appendFile(join(GLOBAL_LOG_DIR, 'daemon.log'), line, 'utf8');
}

async function runCycle() {
  const config = await loadGlobalConfig();
  if (config.watchedProjects.length === 0) {
    await log('No watched projects configured.');
    return;
  }

  await log('Starting hourly verification cycle.');
  const code = await runCli(['check', '--all-watched', '--deep', '--quiet']);
  await log(`Cycle finished with exit code ${code}.`);
}

await log(`Daemon worker started (interval ${intervalMs}ms).`);
await runCycle();

setInterval(() => {
  runCycle().catch(async (error) => {
    await log(`Cycle failed: ${error.message}`);
  });
}, intervalMs);
