import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chdir, cwd } from 'node:process';
import test from 'node:test';
import { runCli } from '../lib/cli.js';
import { createTempProject } from './helpers/project-fixture.js';

test('runCli init configures project via CLI', async () => {
  const project = await createTempProject('cli-init');
  const originalCwd = cwd();

  try {
    chdir(project.root);
    await project.writeJson('package.json', { name: 'app', version: '1.0.0', scripts: {} });

    const code = await runCli(['init']);
    const pkg = JSON.parse(await readFile(project.path('package.json'), 'utf8'));

    assert.equal(code, 0);
    assert.equal(pkg.scripts.postinstall, 'npm-verify check --blocking');
    assert.ok(await readFile(project.path('.npm-verify.json'), 'utf8'));
  } finally {
    chdir(originalCwd);
  }
});

test('runCli init preserves existing .npm-verify.json', async () => {
  const project = await createTempProject('cli-init-preserve-config');
  const originalCwd = cwd();

  try {
    chdir(project.root);
    await project.writeJson('package.json', { name: 'app', version: '1.0.0', scripts: {} });
    await project.writeJson('.npm-verify.json', { allowPackages: ['keep-me'] });

    await runCli(['init']);
    const config = JSON.parse(await readFile(project.path('.npm-verify.json'), 'utf8'));
    assert.deepEqual(config.allowPackages, ['keep-me']);
  } finally {
    chdir(originalCwd);
  }
});
