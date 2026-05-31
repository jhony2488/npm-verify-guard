import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { classifyNewsText, triageNewsItems } from '../../lib/ml/triage-news.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('classifyNewsText ignores opinion articles', async () => {
  const opinion = await readFile(join(__dirname, '../fixtures/ml/news-opinion.txt'), 'utf8');
  const result = await classifyNewsText(opinion, { mlConfig: { useOnnx: false } });
  assert.equal(result.level, 'ignore');
});

test('classifyNewsText flags critical security news', async () => {
  const critical = await readFile(join(__dirname, '../fixtures/ml/news-critical.txt'), 'utf8');
  const result = await classifyNewsText(critical, { mlConfig: { useOnnx: false } });
  assert.notEqual(result.level, 'ignore');
});

test('triageNewsItems produces findings for matching dependencies', async () => {
  const findings = await triageNewsItems(
    [{ title: 'Critical RCE in lodash npm package', description: 'Patch immediately CVE exploit' }],
    [{ name: 'lodash', version: '4.17.21' }],
    { mlConfig: { useOnnx: false } },
  );

  assert.ok(findings.length >= 1);
  assert.equal(findings[0].package, 'lodash');
});
