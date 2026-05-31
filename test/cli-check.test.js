import assert from 'node:assert/strict';
import { chdir, cwd } from 'node:process';
import test from 'node:test';
import { runCli } from '../lib/cli.js';
import { readStatus } from '../lib/lock.js';
import { getProjectPaths } from '../lib/config.js';
import { createTempProject } from './helpers/project-fixture.js';

test('runCli help exits with code 0', async () => {
  assert.equal(await runCli(['help']), 0);
  assert.equal(await runCli(['--help']), 0);
});

test('runCli check --local-only passes on clean project', async () => {
  const project = await createTempProject('cli-check-clean');
  const originalCwd = cwd();

  try {
    chdir(project.root);
    await project.writeJson('package.json', { name: 'clean-app', version: '1.0.0' });
    await project.writeJson('.npm-verify.json', { ml: { enabled: false } });

    const code = await runCli(['check', '--local-only']);
    assert.equal(code, 0);
  } finally {
    chdir(originalCwd);
  }
});

test('runCli check --blocking sets failed status when threats found', async () => {
  const project = await createTempProject('cli-check-block');
  const originalCwd = cwd();

  try {
    chdir(project.root);
    await project.writeJson('package.json', { name: 'app', version: '1.0.0' });
    await project.writeJson('.npm-verify.json', { ml: { enabled: false } });
    await project.writeFile('node_modules/bad/index.js', "eval('hack');", 'utf8');

    const code = await runCli(['check', '--blocking', '--local-only']);
    const status = await readStatus(getProjectPaths(project.root).statusFile);

    assert.equal(code, 1);
    assert.equal(status.status, 'failed');
  } finally {
    chdir(originalCwd);
  }
});

test('runCli check --blocking sets ok status when clean', async () => {
  const project = await createTempProject('cli-check-ok');
  const originalCwd = cwd();

  try {
    chdir(project.root);
    await project.writeJson('package.json', { name: 'app', version: '1.0.0' });
    await project.writeJson('.npm-verify.json', { ml: { enabled: false } });

    const code = await runCli(['check', '--blocking', '--local-only']);
    const status = await readStatus(getProjectPaths(project.root).statusFile);

    assert.equal(code, 0);
    assert.equal(status.status, 'ok');
  } finally {
    chdir(originalCwd);
  }
});

test('runCli report reads saved report file', async () => {
  const project = await createTempProject('cli-report');
  const originalCwd = cwd();

  try {
    chdir(project.root);
    await project.writeJson('package.json', { name: 'app', version: '1.0.0' });
    await project.writeJson('.npm-verify/report.json', {
      generatedAt: new Date().toISOString(),
      summary: { total: 0, high: 0, medium: 0, low: 0, blocking: 0 },
      findings: [],
    });

    const code = await runCli(['report']);
    assert.equal(code, 0);
  } finally {
    chdir(originalCwd);
  }
});

test('runCli report returns 2 when report is missing', async () => {
  const project = await createTempProject('cli-report-missing');
  const originalCwd = cwd();

  try {
    chdir(project.root);
    await project.writeJson('package.json', { name: 'app', version: '1.0.0' });
    assert.equal(await runCli(['report']), 2);
  } finally {
    chdir(originalCwd);
  }
});

test('runCli models status exits with code 0', async () => {
  assert.equal(await runCli(['models', 'status']), 0);
});

test('runCli throws on unknown command', async () => {
  await assert.rejects(() => runCli(['not-a-command']), /Unknown command/);
});
