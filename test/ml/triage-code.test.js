import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { triageCodeContent } from '../../lib/ml/triage-code.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('triageCodeContent escalates malicious sample at layer 2', async () => {
  const malicious = await readFile(join(__dirname, '../fixtures/ml/malicious-exfil.js'), 'utf8');
  const findings = await triageCodeContent(malicious, [], {
    mlConfig: { enabled: true, layer2Threshold: 0.5, layer3Threshold: 0.7 },
    deepScan: false,
  });

  assert.ok(findings.some((f) => f.rule.startsWith('ml-')));
  assert.ok(findings.some((f) => f.severity === 'high' || f.severity === 'medium'));
});

test('triageCodeContent approves benign sample', async () => {
  const benign = await readFile(join(__dirname, '../fixtures/ml/benign-date-validator.js'), 'utf8');
  const findings = await triageCodeContent(benign, [], {
    mlConfig: { enabled: true },
    deepScan: false,
  });

  assert.equal(findings.length, 0);
});

test('triageCodeContent uses MLP fallback when deepScan without ONNX', async () => {
  const malicious = await readFile(join(__dirname, '../fixtures/ml/malicious-exfil.js'), 'utf8');
  const findings = await triageCodeContent(malicious, [], {
    mlConfig: { enabled: true, useOnnx: false, layer2Threshold: 0.3, layer3Threshold: 0.5 },
    deepScan: true,
  });

  assert.ok(findings.some((f) => f.mlLayer === 3 || f.mlLayer === 2));
});
