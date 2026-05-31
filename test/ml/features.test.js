import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { fuseLayer2Scores, buildCodeFeatureVector, normalizeVector } from '../lib/ml/features.js';
import { tokensToVector } from '../lib/ml/tokenizer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('fuseLayer2Scores elevates suspicious tfidf above naive bayes', () => {
  const fused = fuseLayer2Scores(
    { probability: 0.2, label: 'benign' },
    { score: 3.5, maxTermScore: 2.1, suspicious: true },
    { tfidfThreshold: 2.5 },
  );

  assert.ok(fused.probability > 0.5);
  assert.equal(fused.label, 'malicious');
});

test('fuseLayer2Scores keeps benign score when tfidf is clean', () => {
  const fused = fuseLayer2Scores(
    { probability: 0.1, label: 'benign' },
    { score: 0.2, maxTermScore: 0.1, suspicious: false },
    { tfidfThreshold: 2.5 },
  );

  assert.equal(fused.probability, 0.1);
  assert.equal(fused.label, 'benign');
});

test('buildCodeFeatureVector normalizes token counts', async () => {
  const malicious = await readFile(join(__dirname, 'fixtures/ml/malicious-exfil.js'), 'utf8');
  const vector = buildCodeFeatureVector(malicious, ['eval', 'fetch', 'process.env']);
  const sum = vector.reduce((total, value) => total + value, 0);

  assert.ok(vector.every((value) => value >= 0));
  assert.ok(Math.abs(sum - 1) < 0.001 || sum === 0);
});

test('normalizeVector returns zeros for empty counts', () => {
  assert.deepEqual(normalizeVector([0, 0, 0]), [0, 0, 0]);
  assert.deepEqual(normalizeVector(tokensToVector(new Map(), ['a', 'b'])), [0, 0]);
});
