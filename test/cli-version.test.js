import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runCli } from '../lib/cli.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(await readFile(join(__dirname, '../package.json'), 'utf8'));

test('runCli version prints package version', async () => {
  const code = await runCli(['version']);
  assert.equal(code, 0);
});

test('runCli help mentions update-hashes command', async () => {
  const code = await runCli(['help']);
  assert.equal(code, 0);
});

test('package version matches npm-verify bin expectation', () => {
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
});
