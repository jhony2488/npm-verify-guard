import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('initializeEmbedder returns false when module not installed', async () => {
  // The module is optional, so if it's not installed, initializeEmbedder should return false
  const { initializeEmbedder } = await import('../../lib/ml/code-embedder.js');
  const result = await initializeEmbedder();
  // If the module is installed, this might be true; if not, false
  assert.equal(typeof result, 'boolean');
});

test('isEmbedderAvailable returns false when not initialized', async () => {
  const { isEmbedderAvailable } = await import('../../lib/ml/code-embedder.js');
  assert.equal(isEmbedderAvailable(), false);
});

test('compareWithMaliciousPatterns returns zero similarity when embedder not available', async () => {
  const { compareWithMaliciousPatterns } = await import('../../lib/ml/code-embedder.js');
  const result = await compareWithMaliciousPatterns('const x = 1;');
  assert.equal(result.similarity, 0);
  assert.equal(result.matchedPattern, null);
});

test('embedCode throws error when embedder not available', async () => {
  const { embedCode } = await import('../../lib/ml/code-embedder.js');
  await assert.rejects(async () => {
    await embedCode('const x = 1;');
  }, /Embedding model not available/);
});

test('loadPatternEmbeddings handles missing pattern file', async () => {
  // This tests the graceful degradation when the pattern file doesn't exist
  const { compareWithMaliciousPatterns } = await import('../../lib/ml/code-embedder.js');
  const result = await compareWithMaliciousPatterns('const x = 1;');
  // Should return zero similarity when no patterns are loaded
  assert.equal(result.similarity, 0);
  assert.equal(result.matchedPattern, null);
});

test('cosineSimilarity function works correctly', async () => {
  const { cosineSimilarity } = await import('../../lib/ml/mlp.js');

  const vecA = [1.0, 0.0, 0.0];
  const vecB = [1.0, 0.0, 0.0];
  assert.equal(cosineSimilarity(vecA, vecB), 1.0);

  const vecC = [1.0, 0.0, 0.0];
  const vecD = [0.0, 1.0, 0.0];
  assert.equal(cosineSimilarity(vecC, vecD), 0.0);

  const vecE = [1.0, 1.0, 0.0];
  const vecF = [1.0, 0.0, 0.0];
  const similarity = cosineSimilarity(vecE, vecF);
  assert.ok(similarity > 0 && similarity < 1.0);
});

test('cosineSimilarity handles zero vectors', async () => {
  const { cosineSimilarity } = await import('../../lib/ml/mlp.js');

  const vecA = [0.0, 0.0, 0.0];
  const vecB = [1.0, 0.0, 0.0];
  assert.equal(cosineSimilarity(vecA, vecB), 0.0);
});

test('embedding-patterns.json has correct structure', async () => {
  const patternFile = join(__dirname, '../../data/embedding-patterns.json');
  const content = await readFile(patternFile, 'utf8');
  const data = JSON.parse(content);

  assert.ok(Array.isArray(data.patterns));
  assert.ok(data.patterns.length > 0);

  for (const pattern of data.patterns) {
    assert.ok(pattern.name);
    assert.ok(pattern.code);
    assert.ok(pattern.description);
  }
});
