import assert from 'node:assert/strict';
import { chdir, cwd } from 'node:process';
import test from 'node:test';
import { runCli } from '../lib/cli.js';
import { initProject } from '../lib/hooks.js';
import { setFailed, setOk, setRunning } from '../lib/lock.js';
import { buildReport } from '../lib/report.js';
import { getProjectPaths } from '../lib/config.js';
import { createTempProject } from './helpers/project-fixture.js';

test('gate blocks when verification is running', async () => {
  const project = await createTempProject('gate-running');
  const originalCwd = cwd();

  try {
    chdir(project.root);
    await project.writeJson('package.json', { name: 'app', version: '1.0.0', scripts: {} });
    await initProject(project.root);

    const paths = getProjectPaths(project.root);
    await setRunning(paths.statusFile);

    const code = await runCli(['gate']);
    assert.equal(code, 1);
  } finally {
    chdir(originalCwd);
  }
});

test('gate blocks when last verification failed', async () => {
  const project = await createTempProject('gate-failed');
  const originalCwd = cwd();

  try {
    chdir(project.root);
    await project.writeJson('package.json', { name: 'app', version: '1.0.0', scripts: {} });
    await initProject(project.root);

    const paths = getProjectPaths(project.root);
    await setFailed(
      paths.statusFile,
      buildReport([{ severity: 'high', blocking: true, source: 'local', rule: 'eval-usage' }]),
    );

    const code = await runCli(['gate']);
    assert.equal(code, 1);
  } finally {
    chdir(originalCwd);
  }
});

test('gate passes when verification succeeded', async () => {
  const project = await createTempProject('gate-ok');
  const originalCwd = cwd();

  try {
    chdir(project.root);
    await project.writeJson('package.json', { name: 'app', version: '1.0.0', scripts: {} });
    await initProject(project.root);

    const paths = getProjectPaths(project.root);
    await setOk(paths.statusFile, buildReport([]));

    const code = await runCli(['gate']);
    assert.equal(code, 0);
  } finally {
    chdir(originalCwd);
  }
});

test('gate passes for unmonitored projects', async () => {
  const project = await createTempProject('gate-unmonitored');
  const originalCwd = cwd();

  try {
    chdir(project.root);
    await project.writeJson('package.json', { name: 'app', version: '1.0.0' });
    const code = await runCli(['gate']);
    assert.equal(code, 0);
  } finally {
    chdir(originalCwd);
  }
});
