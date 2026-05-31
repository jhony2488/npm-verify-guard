import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { forwardMLP, sigmoid } from '../../lib/ml/mlp.js';
import { tokenizeText } from '../../lib/ml/tokenizer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('sigmoid returns values between 0 and 1', () => {
  assert.ok(sigmoid(0) > 0.49 && sigmoid(0) < 0.51);
  assert.ok(sigmoid(5) > 0.99);
});

test('MLP scores critical news higher than opinion piece', async () => {
  const model = JSON.parse(await readFile(join(__dirname, '../../data/models/news-mlp-model.json'), 'utf8'));
  const keywords = JSON.parse(await readFile(join(__dirname, '../../data/models/threat-keywords.json'), 'utf8'));
  const critical = await readFile(join(__dirname, '../fixtures/ml/news-critical.txt'), 'utf8');
  const opinion = await readFile(join(__dirname, '../fixtures/ml/news-opinion.txt'), 'utf8');

  const criticalTokens = tokenizeText(critical, keywords);
  const opinionTokens = tokenizeText(opinion, keywords);
  const criticalInput = model.vocabulary.map((term) => criticalTokens.get(term) ?? 0);
  const opinionInput = model.vocabulary.map((term) => opinionTokens.get(term) ?? 0);

  const criticalScore = forwardMLP(criticalInput, model).probability;
  const opinionScore = forwardMLP(opinionInput, model).probability;

  assert.ok(criticalScore > opinionScore);
});
