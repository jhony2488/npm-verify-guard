import assert from 'node:assert/strict';
import { chdir, cwd } from 'node:process';
import test from 'node:test';
import { runCli } from '../lib/cli.js';
import { initProject } from '../lib/hooks.js';
import { writeStatus } from '../lib/lock.js';
import { buildReport } from '../lib/report.js';
import { getProjectPaths } from '../lib/config.js';
import { createTempProject } from './helpers/project-fixture.js';

test('gate re-runs verification when status is stale', async () => {
  const project = await createTempProject('gate-stale');
  const originalCwd = cwd();

  try {
    chdir(project.root);
    await project.writeJson('package.json', { name: 'app', version: '1.0.0', scripts: {} });
    await initProject(project.root);
    await project.writeJson('.npm-verify.json', { ml: { enabled: false } });

    const paths = getProjectPaths(project.root);
    const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await writeStatus(paths.statusFile, {
      status: 'ok',
      checkedAt: staleDate,
      summary: buildReport([]).summary,
    });

    const code = await runCli(['gate']);
    assert.equal(code, 0);
  } finally {
    chdir(originalCwd);
  }
});
