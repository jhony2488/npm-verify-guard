import assert from 'node:assert/strict';
import test from 'node:test';
import { scanLocal } from '../lib/scan-local.js';
import { createTempProject } from './helpers/project-fixture.js';

test('scanLocal skips files larger than maxFileSizeKb', async () => {
  const project = await createTempProject('local-size-limit');
  const hugeContent = `eval('${'x'.repeat(600 * 1024)}');`;
  await project.writeFile('node_modules/huge/index.js', hugeContent, 'utf8');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });

  const findings = await scanLocal(project.root, {
    allowPackages: [],
    ignorePaths: [],
    heuristics: { maxFileSizeKb: 512 },
    ml: { enabled: false },
  });

  assert.equal(findings.length, 0);
});

test('scanLocal skips .bin directory', async () => {
  const project = await createTempProject('local-skip-bin');
  await project.writeFile('node_modules/pkg/.bin/cli.js', "eval('malware');", 'utf8');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });

  const findings = await scanLocal(project.root, {
    allowPackages: [],
    ignorePaths: [],
    heuristics: { maxFileSizeKb: 512 },
    ml: { enabled: false },
  });

  assert.equal(findings.length, 0);
});

test('scanLocal detects obfuscated outbound request pattern', async () => {
  const project = await createTempProject('local-obfuscated');
  const content = "atob('ZGVtb') ; fetch('https://evil.test');";
  await project.writeFile('node_modules/obf/index.js', content, 'utf8');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });

  const findings = await scanLocal(project.root, {
    allowPackages: [],
    ignorePaths: [],
    heuristics: { maxFileSizeKb: 512 },
    ml: { enabled: false },
  });

  assert.ok(findings.some((f) => f.rule === 'obfuscated-url'));
});

test('scanLocal scans .mjs and .cjs files', async () => {
  const project = await createTempProject('local-extensions');
  await project.writeFile('node_modules/pkg/index.mjs', 'eval("mjs");', 'utf8');
  await project.writeFile('node_modules/pkg/legacy.cjs', 'eval("cjs");', 'utf8');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });

  const findings = await scanLocal(project.root, {
    allowPackages: [],
    ignorePaths: [],
    heuristics: { maxFileSizeKb: 512 },
    ml: { enabled: false },
  });

  assert.equal(findings.filter((f) => f.rule === 'eval-usage').length, 2);
});
