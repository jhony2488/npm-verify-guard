import assert from 'node:assert/strict';
import test from 'node:test';
import { getModelsStatus } from '../../lib/ml/model-loader.js';
import { trainMultinomialNB, classifyMultinomialNB } from '../../lib/ml/naive-bayes.js';
import { tokenizeCode } from '../../lib/ml/tokenizer.js';

test('getModelsStatus reports bundled models and onnx availability', async () => {
  const status = await getModelsStatus();
  assert.ok(Array.isArray(status.bundledModels));
  assert.ok(status.bundledModels.includes('code-nb-model.json'));
  assert.equal(typeof status.onnxRuntimeAvailable, 'boolean');
  assert.equal(typeof status.modelsDir, 'string');
});

test('naive bayes training produces classifiable model', () => {
  const vocabulary = ['eval', 'fetch'];
  const samples = [
    { label: 'benign', tokens: new Map([['fetch', 1]]) },
    { label: 'malicious', tokens: new Map([['eval', 2], ['fetch', 1]]) },
  ];
  const model = trainMultinomialNB(samples, vocabulary);
  const malicious = classifyMultinomialNB(new Map([['eval', 2]]), model);
  const benign = classifyMultinomialNB(new Map([['fetch', 1]]), model);

  assert.ok(malicious.probability > benign.probability);
});

test('tokenizeCode captures bigram patterns', () => {
  const tokens = tokenizeCode('require("child_process"); child_process.exec("ls");');
  assert.ok(tokens.get('child_process') >= 1);
  assert.ok(tokens.get('exec') >= 1);
});
