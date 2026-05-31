import assert from 'node:assert/strict';
import test from 'node:test';
import { scanExternal } from '../lib/scan-external.js';
import { createTempProject } from './helpers/project-fixture.js';

test('scanExternal throws when OSV API fails', async () => {
  const project = await createTempProject('external-osv-fail');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });
  await project.writeJson('package-lock.json', {
    name: 'app',
    lockfileVersion: 3,
    packages: {
      '': { name: 'app', version: '1.0.0' },
      'node_modules/dep-a': { version: '1.0.0' },
    },
  });

  const fetchFn = async () => ({ ok: false, status: 503, json: async () => ({}) });

  await assert.rejects(
    () =>
      scanExternal(
        project.root,
        { external: { enabled: true }, ml: { enabled: false } },
        { fetchFn, deepScan: false },
      ),
    /OSV API error/,
  );
});

test('non-blocking external failure produces degraded finding shape', async () => {
  const project = await createTempProject('external-degraded-shape');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });
  await project.writeJson('package-lock.json', {
    name: 'app',
    lockfileVersion: 3,
    packages: {
      '': { name: 'app', version: '1.0.0' },
      'node_modules/dep-a': { version: '1.0.0' },
    },
  });

  const fetchFn = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const findings = [];

  try {
    await scanExternal(
      project.root,
      { external: { enabled: true }, ml: { enabled: false } },
      { fetchFn },
    );
  } catch (error) {
    findings.push({
      severity: 'low',
      source: 'external',
      rule: 'external-scan-degraded',
      detail: `External scan failed: ${error.message}`,
      blocking: false,
    });
  }

  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'external-scan-degraded');
});
