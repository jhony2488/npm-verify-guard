import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileExists } from './config.js';

export async function writeStatus(statusFile, status) {
  await mkdir(dirname(statusFile), { recursive: true });
  await writeFile(statusFile, `${JSON.stringify(status, null, 2)}\n`, 'utf8');
}

export async function readStatus(statusFile) {
  if (!(await fileExists(statusFile))) {
    return null;
  }

  const raw = await readFile(statusFile, 'utf8');
  return JSON.parse(raw);
}

export async function setRunning(statusFile) {
  await writeStatus(statusFile, {
    status: 'running',
    startedAt: new Date().toISOString(),
  });
}

export async function setOk(statusFile, report) {
  await writeStatus(statusFile, {
    status: 'ok',
    checkedAt: new Date().toISOString(),
    summary: report.summary,
  });
}

export async function setFailed(statusFile, report) {
  await writeStatus(statusFile, {
    status: 'failed',
    checkedAt: new Date().toISOString(),
    summary: report.summary,
    findings: report.findings.slice(0, 50),
  });
}

export function isStale(checkedAt, maxAgeHours = 24) {
  if (!checkedAt) {
    return true;
  }

  const checked = new Date(checkedAt).getTime();
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  return Date.now() - checked > maxAgeMs;
}
