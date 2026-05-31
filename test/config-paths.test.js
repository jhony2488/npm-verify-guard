import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { getProjectPaths, getDataPath } from '../lib/config.js';
import { loadDependencies } from '../lib/scan-external.js';
import { createTempProject } from './helpers/project-fixture.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('getProjectPaths returns expected structure', () => {
  const paths = getProjectPaths('/tmp/my-app');
  assert.ok(paths.root.endsWith('my-app'));
  assert.ok(paths.nodeModules.endsWith('node_modules'));
  assert.ok(paths.statusFile.includes('.npm-verify'));
  assert.ok(paths.reportFile.endsWith('report.json'));
});

test('getDataPath resolves bundled data files', async () => {
  const feedsPath = getDataPath('default-feeds.json');
  const raw = await readFile(feedsPath, 'utf8');
  const feeds = JSON.parse(raw);
  assert.ok(Array.isArray(feeds.rssFeeds));
  assert.ok(feeds.rssFeeds.length >= 2);
  assert.ok(feeds.osvApi.includes('osv.dev'));
});

test('loadDependencies reads nested lockfile packages', async () => {
  const project = await createTempProject('deps-lock');
  await project.writeJson('package-lock.json', {
    name: 'app',
    lockfileVersion: 3,
    packages: {
      '': { name: 'app', version: '1.0.0' },
      'node_modules/lodash': { version: '4.17.21' },
      'node_modules/@scope/pkg': { version: '2.0.0' },
    },
  });

  const deps = await loadDependencies(project.root);
  const names = deps.map((d) => d.name).sort();

  assert.deepEqual(names, ['@scope/pkg', 'lodash']);
});

test('loadDependencies strips semver prefixes from package.json', async () => {
  const project = await createTempProject('deps-semver');
  await project.writeJson('package.json', {
    name: 'app',
    version: '1.0.0',
    dependencies: { axios: '^1.6.0', leftpad: '~1.0.0' },
  });

  const deps = await loadDependencies(project.root);
  const map = Object.fromEntries(deps.map((d) => [d.name, d.version]));

  assert.equal(map.axios, '1.6.0');
  assert.equal(map.leftpad, '1.0.0');
});

test('default-feeds.json contains security-focused RSS sources', async () => {
  const raw = await readFile(join(__dirname, '../data/default-feeds.json'), 'utf8');
  const feeds = JSON.parse(raw);

  assert.ok(feeds.rssFeeds.some((url) => url.includes('github.blog')));
  assert.ok(feeds.rssFeeds.some((url) => url.includes('snyk.io')));
  assert.ok(feeds.nvdApi.includes('nvd.nist.gov'));
});
