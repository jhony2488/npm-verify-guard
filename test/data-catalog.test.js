import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('training-samples.json has balanced code and news datasets', async () => {
  const raw = await readFile(join(__dirname, '../data/training-samples.json'), 'utf8');
  const samples = JSON.parse(raw);

  assert.ok(samples.code.benign.length >= 10);
  assert.ok(samples.code.malicious.length >= 10);
  assert.ok(samples.news.benign.length >= 8);
  assert.ok(samples.news.malicious.length >= 8);
});

test('malware-hashes.json keeps bundled fixture hash for tests', async () => {
  const raw = await readFile(join(__dirname, '../data/malware-hashes.json'), 'utf8');
  const catalog = JSON.parse(raw);
  const fixture = await readFile(join(__dirname, 'fixtures/ml/malicious-exfil.js'), 'utf8');
  const { createHash } = await import('node:crypto');
  const fixtureHash = createHash('sha256').update(fixture).digest('hex');

  assert.ok(Array.isArray(catalog.hashes));
  assert.ok(catalog.hashes.includes(fixtureHash));
});

test('threat-keywords.json includes npm supply-chain phrases', async () => {
  const raw = await readFile(join(__dirname, '../data/models/threat-keywords.json'), 'utf8');
  const keywords = JSON.parse(raw);

  assert.ok(keywords.critical.includes('supply chain attack'));
  assert.ok(keywords.high.includes('npm registry'));
  assert.ok(keywords.medium.includes('dependency confusion'));
});

test('malware-sources.json configures osv-npm-malicious source', async () => {
  const raw = await readFile(join(__dirname, '../data/malware-sources.json'), 'utf8');
  const config = JSON.parse(raw);

  assert.ok(config.sources.some((source) => source.type === 'osv-npm-malicious' && source.enabled));
});
