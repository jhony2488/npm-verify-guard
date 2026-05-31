import assert from 'node:assert/strict';
import test from 'node:test';
import {
  readStatus,
  setFailed,
  setOk,
  setRunning,
  writeStatus,
  isStale,
} from '../lib/lock.js';
import { buildReport } from '../lib/report.js';
import { createTempProject } from './helpers/project-fixture.js';

test('lock lifecycle writes running, ok, and failed states', async () => {
  const project = await createTempProject('lock-lifecycle');
  const statusFile = project.path('.npm-verify', 'status.json');

  await setRunning(statusFile);
  let status = await readStatus(statusFile);
  assert.equal(status.status, 'running');
  assert.ok(status.startedAt);

  const cleanReport = buildReport([]);
  await setOk(statusFile, cleanReport);
  status = await readStatus(statusFile);
  assert.equal(status.status, 'ok');
  assert.ok(status.checkedAt);
  assert.equal(status.summary.total, 0);

  const threatReport = buildReport([
    { severity: 'high', blocking: true, source: 'local', rule: 'eval-usage' },
  ]);
  await setFailed(statusFile, threatReport);
  status = await readStatus(statusFile);
  assert.equal(status.status, 'failed');
  assert.equal(status.findings.length, 1);
});

test('readStatus returns null when file does not exist', async () => {
  const project = await createTempProject('lock-missing');
  assert.equal(await readStatus(project.path('.npm-verify', 'missing.json')), null);
});

test('writeStatus creates nested directories', async () => {
  const project = await createTempProject('lock-nested');
  const statusFile = project.path('.npm-verify', 'nested', 'status.json');
  await writeStatus(statusFile, { status: 'ok' });
  assert.equal((await readStatus(statusFile)).status, 'ok');
});

test('isStale treats missing checkedAt as stale', () => {
  assert.equal(isStale(undefined), true);
  assert.equal(isStale(null), true);
});
