import assert from 'node:assert/strict';
import test from 'node:test';
import { scanExternal } from '../lib/scan-external.js';
import { createTempProject } from './helpers/project-fixture.js';

test('scanExternal maps OSV medium severity correctly', async () => {
  const project = await createTempProject('osv-medium');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });
  await project.writeJson('package-lock.json', {
    name: 'app',
    lockfileVersion: 3,
    packages: {
      '': { name: 'app', version: '1.0.0' },
      'node_modules/med-lib': { version: '1.0.0' },
    },
  });

  const fetchFn = async (url) => {
    if (String(url).includes('osv.dev')) {
      return {
        ok: true,
        json: async () => ({
          vulns: [{ id: 'CVE-MED', summary: 'moderate issue', severity: [{ score: 'MEDIUM 5.5' }] }],
        }),
      };
    }
    return { ok: false, text: async () => '' };
  };

  const findings = await scanExternal(
    project.root,
    { external: { enabled: true }, ml: { enabled: false } },
    { fetchFn, deepScan: false },
  );

  const osv = findings.find((f) => f.rule === 'osv-vulnerability');
  assert.ok(osv);
  assert.equal(osv.severity, 'medium');
  assert.equal(osv.blocking, false);
});

test('scanExternal maps OSV low severity correctly', async () => {
  const project = await createTempProject('osv-low');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });
  await project.writeJson('package-lock.json', {
    name: 'app',
    lockfileVersion: 3,
    packages: {
      '': { name: 'app', version: '1.0.0' },
      'node_modules/low-lib': { version: '0.1.0' },
    },
  });

  const fetchFn = async (url) => {
    if (String(url).includes('osv.dev')) {
      return {
        ok: true,
        json: async () => ({
          vulns: [{ id: 'CVE-LOW', summary: 'minor issue', severity: [{ score: 'LOW 2.1' }] }],
        }),
      };
    }
    return { ok: false, text: async () => '' };
  };

  const findings = await scanExternal(
    project.root,
    { external: { enabled: true }, ml: { enabled: false } },
    { fetchFn, deepScan: false },
  );

  const osv = findings.find((f) => f.rule === 'osv-vulnerability');
  assert.ok(osv);
  assert.equal(osv.severity, 'low');
});

test('scanExternal skips external scan when disabled in config', async () => {
  const project = await createTempProject('external-disabled');
  await project.writeJson('package.json', {
    name: 'app',
    version: '1.0.0',
    dependencies: { lodash: '4.17.21' },
  });

  let fetchCalled = false;
  const fetchFn = async () => {
    fetchCalled = true;
    return { ok: true, json: async () => ({ vulns: [] }) };
  };

  const findings = await scanExternal(
    project.root,
    { external: { enabled: false } },
    { fetchFn },
  );

  assert.equal(findings.length, 0);
  assert.equal(fetchCalled, false);
});
