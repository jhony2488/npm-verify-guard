import assert from 'node:assert/strict';
import test from 'node:test';
import { scanExternal, normalizeFeedItems, matchNewsAlerts } from '../lib/scan-external.js';
import { createTempProject } from './helpers/project-fixture.js';

test('scanExternal uses package-lock dependencies for OSV lookup', async () => {
  const project = await createTempProject('external-lock');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });
  await project.writeJson('package-lock.json', {
    name: 'app',
    lockfileVersion: 3,
    packages: {
      '': { name: 'app', version: '1.0.0' },
      'node_modules/vulnerable-pkg': { version: '1.2.3' },
    },
  });

  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, body: init?.body ? JSON.parse(init.body) : null });
    if (String(url).includes('osv.dev')) {
      return {
        ok: true,
        json: async () => ({
          vulns: [{ id: 'CVE-2024-9999', summary: 'critical remote code execution', severity: [{ score: '9.8' }] }],
        }),
      };
    }
    return { ok: false, text: async () => '' };
  };

  const findings = await scanExternal(
    project.root,
    { external: { enabled: true }, ml: { enabled: false, useOnnx: false } },
    { fetchFn, deepScan: false },
  );

  const osvCalls = calls.filter((call) => String(call.url).includes('osv.dev'));
  assert.equal(osvCalls.length, 1);
  assert.equal(osvCalls[0].body.package.name, 'vulnerable-pkg');
  assert.ok(findings.some((f) => f.rule === 'osv-vulnerability'));
});

test('scanExternal falls back to package.json when lockfile is absent', async () => {
  const project = await createTempProject('external-pkg-json');
  await project.writeJson('package.json', {
    name: 'app',
    version: '1.0.0',
    dependencies: { 'my-lib': '^2.0.0' },
  });

  const fetchFn = async () => ({
    ok: true,
    json: async () => ({ vulns: [] }),
  });

  const findings = await scanExternal(
    project.root,
    { external: { enabled: true }, ml: { enabled: false } },
    { fetchFn, deepScan: false },
  );

  assert.equal(findings.length, 0);
});

test('scanExternal returns empty when project has no dependencies', async () => {
  const project = await createTempProject('external-empty');
  await project.writeJson('package.json', { name: 'app', version: '1.0.0' });

  const fetchFn = async () => {
    throw new Error('fetch should not be called');
  };

  const findings = await scanExternal(project.root, { external: { enabled: true } }, { fetchFn });
  assert.equal(findings.length, 0);
});

test('normalizeFeedItems parses atom feeds', () => {
  const items = normalizeFeedItems({
    feed: {
      entry: {
        title: 'Atom advisory',
        summary: 'npm malware campaign',
        updated: '2026-01-01',
      },
    },
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Atom advisory');
});

test('matchNewsAlerts matches scoped package names', () => {
  const findings = matchNewsAlerts(
    [{ title: 'Attack on @scope/pkg package', description: 'details' }],
    [{ name: '@scope/pkg', version: '1.0.0' }],
  );

  assert.equal(findings.length, 1);
  assert.equal(findings[0].package, '@scope/pkg');
});
