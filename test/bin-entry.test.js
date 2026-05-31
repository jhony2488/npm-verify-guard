import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const binPath = join(__dirname, '../bin/npm-verify.js');
const pkg = JSON.parse(await readFile(join(__dirname, '../package.json'), 'utf8'));

test('bin/npm-verify.js --version prints package version', () => {
  const result = spawnSync(process.execPath, [binPath, '--version'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), pkg.version);
});

test('bin/npm-verify.js without args exits 0 and prints quick start', () => {
  const result = spawnSync(process.execPath, [binPath], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /npm-verify init/);
});

test('bin/npm-verify.js unknown command exits with code 2', () => {
  const result = spawnSync(process.execPath, [binPath, 'not-a-command'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown command/);
});
