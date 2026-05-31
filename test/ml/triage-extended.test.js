import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { triageCodeContent } from '../../lib/ml/triage-code.js';
import { classifyNewsText } from '../../lib/ml/triage-news.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('triageCodeContent skips ML when layer 1 already blocks', async () => {
  const benign = await readFile(join(__dirname, '../fixtures/ml/benign-date-validator.js'), 'utf8');
  const layer1 = [{ severity: 'high', blocking: true, rule: 'eval-usage' }];
  const findings = await triageCodeContent(benign, layer1, { mlConfig: { enabled: true } });

  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'eval-usage');
});

test('triageCodeContent fusion escalates tfidf-only suspicion', async () => {
  const malicious = await readFile(join(__dirname, '../fixtures/ml/malicious-exfil.js'), 'utf8');
  const findings = await triageCodeContent(malicious, [], {
    mlConfig: { enabled: true, layer2Threshold: 0.55, layer3Threshold: 0.95, tfidfThreshold: 0.5 },
    deepScan: false,
  });

  assert.ok(findings.some((finding) => finding.rule.includes('fusion') || finding.rule.startsWith('ml-')));
});

test('classifyNewsText flags typosquat supply-chain headline', async () => {
  const text = await readFile(join(__dirname, '../fixtures/ml/news-typosquat.txt'), 'utf8');
  const result = await classifyNewsText(text.trim(), { mlConfig: { newsLayer2Threshold: 0.35 } });

  assert.notEqual(result.level, 'ignore');
});

test('classifyNewsText ignores benign release notes tone', async () => {
  const text = 'Release notes for eslint 9 and prettier integration tips';
  const result = await classifyNewsText(text, { mlConfig: { newsLayer2Threshold: 0.45 } });

  assert.equal(result.level, 'ignore');
});
