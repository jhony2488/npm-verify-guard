import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { platform } from 'node:os';
import { loadGlobalConfig } from './config.js';

const execFileAsync = promisify(execFile);

function writeCrontab(content) {
  return new Promise((resolve, reject) => {
    const child = spawn('crontab', ['-']);
    let stderr = '';

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr || `crontab exited with code ${code}`));
    });

    child.stdin.write(content);
    child.stdin.end();
  });
}
const TASK_NAME = 'npm-verify-guard';
const CRON_MARKER = '# npm-verify-guard';

function getCheckCommand() {
  return 'npm-verify check --all-watched --deep --quiet';
}

export async function installScheduler() {
  const config = await loadGlobalConfig();
  const command = getCheckCommand();

  if (platform() === 'win32') {
    await execFileAsync('schtasks', [
      '/Create',
      '/F',
      '/SC',
      'HOURLY',
      '/MO',
      String(config.intervalHours ?? 1),
      '/TN',
      TASK_NAME,
      '/TR',
      command,
    ]);
    return;
  }

  const cronLine = `0 */${config.intervalHours ?? 1} * * * ${command} ${CRON_MARKER}`;
  const { stdout } = await execFileAsync('crontab', ['-l']).catch(() => ({ stdout: '' }));
  const lines = stdout
    .split('\n')
    .filter((line) => line.trim() && !line.includes(CRON_MARKER));

  lines.push(cronLine);
  await writeCrontab(`${lines.join('\n')}\n`);
}

export async function uninstallScheduler() {
  if (platform() === 'win32') {
    await execFileAsync('schtasks', ['/Delete', '/F', '/TN', TASK_NAME]).catch(() => {});
    return;
  }

  const { stdout } = await execFileAsync('crontab', ['-l']).catch(() => ({ stdout: '' }));
  const lines = stdout.split('\n').filter((line) => line.trim() && !line.includes(CRON_MARKER));
  await writeCrontab(lines.length ? `${lines.join('\n')}\n` : '');
}

export async function schedulerStatus() {
  if (platform() === 'win32') {
    try {
      const { stdout } = await execFileAsync('schtasks', ['/Query', '/TN', TASK_NAME, '/FO', 'LIST']);
      return stdout.trim() || 'Scheduler task not found.';
    } catch {
      return 'Scheduler task not installed.';
    }
  }

  const { stdout } = await execFileAsync('crontab', ['-l']).catch(() => ({ stdout: '' }));
  const line = stdout.split('\n').find((entry) => entry.includes(CRON_MARKER));
  return line ? `Cron installed: ${line}` : 'Cron task not installed.';
}
