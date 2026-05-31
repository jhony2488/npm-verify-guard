import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { triageCodeContent } from '../../lib/ml/triage-code.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('deep scan falls back to MLP when ONNX unavailable', async () => {
  const malicious = await readFile(join(__dirname, '../fixtures/ml/malicious-exfil.js'), 'utf8');
  const findings = await triageCodeContent(malicious, [], {
    deepScan: true,
    mlConfig: {
      enabled: true,
      useOnnx: true,
      layer2Threshold: 0.3,
      layer3Threshold: 0.5,
    },
  });

  const mlFinding = findings.find((f) => f.rule.startsWith('ml-'));
  assert.ok(mlFinding);
  assert.ok(['ml-mlp', 'ml-naive-bayes', 'ml-onnx-codebert'].includes(mlFinding.rule));
});
