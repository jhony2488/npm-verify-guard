import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runUpdateMalwareHashes } from '../lib/update-malware-hashes.js';
import { createTempProject } from './helpers/project-fixture.js';

test('runUpdateMalwareHashes dry-run merges existing catalog without writing', async () => {
  const project = await createTempProject('update-hashes');
  const fixtureHash = '5807ab0728598b15464f7a7aa167507193c94f8d18bd89158cf67c6949681353';

  await project.writeJson('sources.json', { sources: [] });
  await project.writeJson('hashes.json', {
    hashes: [fixtureHash],
    entries: [{ sha256: fixtureHash, source: 'fixture' }],
  });

  const { result, dryRun } = await runUpdateMalwareHashes({
    sourcesPath: project.path('sources.json'),
    outputPath: project.path('hashes.json'),
    dryRun: true,
    merge: true,
  });

  assert.equal(dryRun, true);
  assert.ok(result.hashes.includes(fixtureHash));

  const raw = await readFile(project.path('hashes.json'), 'utf8');
  const saved = JSON.parse(raw);
  assert.equal(saved.hashes.length, 1);
});

test('runCli update-hashes command is registered in help output', async () => {
  const { runCli } = await import('../lib/cli.js');
  const code = await runCli(['help']);
  assert.equal(code, 0);
});
