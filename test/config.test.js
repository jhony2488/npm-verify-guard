import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesIgnorePattern, loadProjectConfig } from '../lib/config.js';
import { createTempProject } from './helpers/project-fixture.js';

test('matchesIgnorePattern supports globstar and single star', () => {
  assert.equal(matchesIgnorePattern('lodash/test/index.js', ['**/test/**']), true);
  assert.equal(matchesIgnorePattern('lodash/lib/index.js', ['**/test/**']), false);
  assert.equal(matchesIgnorePattern('pkg/docs/readme.md', ['**/docs/**']), true);
  assert.equal(matchesIgnorePattern('pkg/.bin/eslint', ['**/.bin/**']), true);
});

test('matchesIgnorePattern normalizes Windows paths', () => {
  assert.equal(matchesIgnorePattern('pkg\\test\\file.js', ['**/test/**']), true);
});

test('loadProjectConfig merges overrides from .npm-verify.json', async () => {
  const project = await createTempProject('config-merge');
  await project.writeJson('package.json', { name: 'demo', version: '1.0.0' });
  await project.writeJson('.npm-verify.json', {
    allowPackages: ['safe-pkg'],
    blockOnMedium: true,
    ml: { layer2Threshold: 0.55 },
  });

  const config = await loadProjectConfig(project.root);
  assert.deepEqual(config.allowPackages, ['safe-pkg']);
  assert.equal(config.blockOnMedium, true);
  assert.equal(config.ml.layer2Threshold, 0.55);
  assert.equal(config.blockOnHigh, true);
});

test('loadProjectConfig returns defaults when file is absent', async () => {
  const project = await createTempProject('config-defaults');
  const config = await loadProjectConfig(project.root);
  assert.equal(config.external.enabled, true);
  assert.equal(config.ml.enabled, true);
});
