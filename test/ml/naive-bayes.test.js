import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tokenizeCode } from '../../lib/ml/tokenizer.js';
import { classifyMultinomialNB } from '../../lib/ml/naive-bayes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('Naive Bayes classifies malicious code with high probability', async () => {
  const model = JSON.parse(await readFile(join(__dirname, '../../data/models/code-nb-model.json'), 'utf8'));
  const malicious = await readFile(join(__dirname, '../fixtures/ml/malicious-exfil.js'), 'utf8');
  const benign = await readFile(join(__dirname, '../fixtures/ml/benign-date-validator.js'), 'utf8');

  const maliciousResult = classifyMultinomialNB(tokenizeCode(malicious), model);
  const benignResult = classifyMultinomialNB(tokenizeCode(benign), model);

  assert.ok(maliciousResult.probability > benignResult.probability);
  assert.equal(maliciousResult.label, 'malicious');
});
