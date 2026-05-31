import { spawn } from 'node:child_process';
import { access, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLOBAL_DIR, loadGlobalConfig } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');
const PID_FILE = join(GLOBAL_DIR, 'daemon.pid');
const INTERVAL_MS = 60 * 60 * 1000;

async function pidFileExists() {
  try {
    await access(PID_FILE);
    return true;
  } catch {
    return false;
  }
}

export async function daemonStart() {
  if (await pidFileExists()) {
    const pid = (await readFile(PID_FILE, 'utf8')).trim();
    if (pid) {
      try {
        process.kill(Number(pid), 0);
        throw new Error(`Daemon already running (pid ${pid}).`);
      } catch (error) {
        if (error.code !== 'ESRCH') {
          throw error;
        }
      }
    }
  }

  const config = await loadGlobalConfig();
  const intervalMs = (config.intervalHours ?? 1) * INTERVAL_MS;
  const workerPath = join(PACKAGE_ROOT, 'lib', 'daemon-worker.js');

  const child = spawn(process.execPath, [workerPath, String(intervalMs)], {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();
  await writeFile(PID_FILE, `${child.pid}\n`, 'utf8');
}

export async function daemonStop() {
  if (!(await pidFileExists())) {
    return 'Daemon is not running.';
  }

  const pid = Number(await readFile(PID_FILE, 'utf8'));
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    // process may already be gone
  }

  await writeFile(PID_FILE, '', 'utf8');
}

export async function daemonStatus() {
  if (!(await pidFileExists())) {
    return 'Daemon is not running.';
  }

  const pid = (await readFile(PID_FILE, 'utf8')).trim();
  if (!pid) {
    return 'Daemon is not running.';
  }

  try {
    process.kill(Number(pid), 0);
    return `Daemon running (pid ${pid}).`;
  } catch {
    return 'Daemon pid file exists but process is not running.';
  }
}
