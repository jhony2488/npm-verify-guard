import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { tokenizeCode } from '../../lib/ml/tokenizer.js';
import { computeTfidfScore } from '../../lib/ml/tfidf.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('tokenizeCode extracts malware keywords', () => {
  const tokens = tokenizeCode('eval(process.env.SECRET); fetch("http://x");');
  assert.ok(tokens.get('eval') >= 1);
  assert.ok(tokens.get('process.env') >= 1);
  assert.ok(tokens.get('fetch') >= 1);
});

test('computeTfidfScore flags malicious fixture above benign', async () => {
  const tfidfModel = JSON.parse(
    await readFile(join(__dirname, '../../data/models/code-tfidf-idf.json'), 'utf8'),
  );
  const idfMap = new Map(
    Object.entries(tfidfModel.documentFrequency).map(([term, count]) => [
      term,
      Math.log((tfidfModel.totalDocuments + 1) / (count + 1)) + 1,
    ]),
  );

  const malicious = await readFile(join(__dirname, '../fixtures/ml/malicious-exfil.js'), 'utf8');
  const benign = await readFile(join(__dirname, '../fixtures/ml/benign-date-validator.js'), 'utf8');

  const suspiciousScore = computeTfidfScore(tokenizeCode(malicious), idfMap, { threshold: 1 });
  const benignScore = computeTfidfScore(tokenizeCode(benign), idfMap, { threshold: 1 });

  assert.ok(suspiciousScore.score > benignScore.score);
  assert.equal(suspiciousScore.suspicious, true);
});
