import assert from 'node:assert/strict';
import test from 'node:test';
import { computeTf, buildDocumentFrequency, computeIdf, computeTfidfScore, buildIdfMap } from '../../lib/ml/tfidf.js';

test('computeTf normalizes term counts', () => {
  const tf = computeTf(new Map([
    ['eval', 2],
    ['fetch', 2],
  ]));

  assert.equal(tf.get('eval'), 0.5);
  assert.equal(tf.get('fetch'), 0.5);
});

test('buildDocumentFrequency counts documents per term', () => {
  const df = buildDocumentFrequency([
    new Map([['eval', 1], ['fetch', 1]]),
    new Map([['eval', 1]]),
  ]);

  assert.equal(df.eval, 2);
  assert.equal(df.fetch, 1);
});

test('computeIdf gives higher weight to rare terms', () => {
  const idf = computeIdf({ eval: 1, fetch: 2 }, 2);
  const idfMap = idf;
  assert.ok(idfMap.get('eval') > idfMap.get('fetch'));
});

test('computeTfidfScore returns suspicious false for empty tokens', () => {
  const result = computeTfidfScore(new Map(), new Map(), { threshold: 1 });
  assert.equal(result.score, 0);
  assert.equal(result.suspicious, false);
});

test('buildIdfMap mirrors computeIdf output', () => {
  const map = buildIdfMap({ totalDocuments: 2, documentFrequency: { eval: 1, fetch: 2 } });
  assert.ok(map.get('eval') > map.get('fetch'));
});

test('computeTfidfScore ignores unknown terms and uses max-term weighting', () => {
  const idfMap = new Map([
    ['eval', 3],
    ['fetch', 2],
  ]);
  const result = computeTfidfScore(new Map([['eval', 2], ['unknown', 5]]), idfMap, { threshold: 1.5 });
  assert.ok(result.score > 0);
  assert.ok(result.maxTermScore > 0);
  assert.equal(result.matchedTerms, 1);
});
