import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { initProject, isMonitoredProject, HOOKS } from '../lib/hooks.js';
import { createTempProject } from './helpers/project-fixture.js';

test('initProject injects npm-verify hooks and creates config', async () => {
  const project = await createTempProject('hooks-init');
  await project.writeJson('package.json', { name: 'demo-app', version: '1.0.0', scripts: {} });

  await initProject(project.root);

  const pkg = JSON.parse(await readFile(project.path('package.json'), 'utf8'));
  assert.equal(pkg.scripts.postinstall, HOOKS.postinstall);
  assert.equal(pkg.scripts.prestart, HOOKS.prestart);
  assert.equal(pkg.scripts.predev, HOOKS.predev);
  assert.equal(pkg.scripts.pretest, HOOKS.pretest);
  assert.ok(await isMonitoredProject(project.root));
});

test('initProject throws when package.json is missing', async () => {
  const project = await createTempProject('hooks-missing-pkg');
  await assert.rejects(() => initProject(project.root), /package.json not found/);
});

test('initProject refuses to overwrite existing scripts without force', async () => {
  const project = await createTempProject('hooks-conflict');
  await project.writeJson('package.json', {
    name: 'demo-app',
    version: '1.0.0',
    scripts: { postinstall: 'echo custom' },
  });

  await assert.rejects(() => initProject(project.root), /postinstall.*already exists/);
});

test('initProject overwrites scripts with force flag', async () => {
  const project = await createTempProject('hooks-force');
  await project.writeJson('package.json', {
    name: 'demo-app',
    version: '1.0.0',
    scripts: { postinstall: 'echo custom' },
  });

  await initProject(project.root, { force: true });
  const pkg = JSON.parse(await readFile(project.path('package.json'), 'utf8'));
  assert.equal(pkg.scripts.postinstall, HOOKS.postinstall);
});

test('isMonitoredProject returns false without hooks', async () => {
  const project = await createTempProject('hooks-unmonitored');
  await project.writeJson('package.json', { name: 'plain', version: '1.0.0' });
  assert.equal(await isMonitoredProject(project.root), false);
});
