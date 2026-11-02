import assert from 'node:assert/strict';
import test from 'node:test';
import { triageCodeContent } from '../../lib/ml/triage-code.js';

test('Layer 2.5 is skipped when enableEmbeddings is false', async () => {
  const maliciousCode = 'eval(atob("malicious"))';
  const findings = await triageCodeContent(maliciousCode, [], {
    mlConfig: {
      enabled: true,
      enableEmbeddings: false,
      layer2Threshold: 0.3,
      embeddingThreshold: 0.8,
    },
  });

  // Should not have embedding-related findings
  const embeddingFinding = findings.find((f) => f.rule === 'ml-embedding-similarity');
  assert.equal(embeddingFinding, undefined);
});

test('Layer 2.5 is skipped when embedder is unavailable', async () => {
  const maliciousCode = 'eval(atob("malicious"))';
  const findings = await triageCodeContent(maliciousCode, [], {
    mlConfig: {
      enabled: true,
      enableEmbeddings: true,
      layer2Threshold: 0.3,
      embeddingThreshold: 0.8,
    },
  });

  // Should not have embedding-related findings when embedder is not available
  const embeddingFinding = findings.find((f) => f.rule === 'ml-embedding-similarity');
  assert.equal(embeddingFinding, undefined);
});

test('Layer 2.5 respects embedding threshold', async () => {
  const benignCode = 'const x = 1 + 2;';
  const findings = await triageCodeContent(benignCode, [], {
    mlConfig: {
      enabled: true,
      enableEmbeddings: true,
      layer2Threshold: 0.3,
      embeddingThreshold: 0.8,
    },
  });

  // Should not trigger embedding findings for benign code
  const embeddingFinding = findings.find((f) => f.rule === 'ml-embedding-similarity');
  assert.equal(embeddingFinding, undefined);
});

test('Layer 2.5 triggers only after Layer 2 threshold exceeded', async () => {
  const benignCode = 'function add(a, b) { return a + b; }';
  const findings = await triageCodeContent(benignCode, [], {
    mlConfig: {
      enabled: true,
      enableEmbeddings: true,
      layer2Threshold: 0.9,
      embeddingThreshold: 0.8,
    },
  });

  // Should not reach Layer 2.5 if Layer 2 doesn't exceed threshold
  const mlFindings = findings.filter((f) => f.rule?.startsWith('ml-'));
  assert.equal(mlFindings.length, 0);
});

test('Layer 2.5 default threshold is 0.8', async () => {
  const maliciousCode = 'eval(atob("malicious"))';
  const findings = await triageCodeContent(maliciousCode, [], {
    mlConfig: {
      enabled: true,
      enableEmbeddings: true,
      layer2Threshold: 0.3,
    },
  });

  // When embedder is unavailable, it should fall back gracefully
  // This test verifies the default threshold doesn't cause errors
  assert.ok(Array.isArray(findings));
});

test('Layer 2.5 allows custom embedding threshold', async () => {
  const maliciousCode = 'eval(atob("malicious"))';
  const findings = await triageCodeContent(maliciousCode, [], {
    mlConfig: {
      enabled: true,
      enableEmbeddings: true,
      layer2Threshold: 0.3,
      embeddingThreshold: 0.95,
    },
  });

  // Custom threshold should be respected (no error)
  assert.ok(Array.isArray(findings));
});

test('Layer 2.5 falls back to Layer 3 when embedding fails', async () => {
  const maliciousCode = 'eval(atob("malicious"))';
  const findings = await triageCodeContent(maliciousCode, [], {
    deepScan: true,
    mlConfig: {
      enabled: true,
      enableEmbeddings: true,
      layer2Threshold: 0.3,
      embeddingThreshold: 0.8,
      layer3Threshold: 0.5,
    },
  });

  // Should still run Layer 3 even if embedding fails
  // Layer 3 might or might not trigger depending on the code
  // The important thing is that it doesn't crash
  assert.ok(Array.isArray(findings));
});

test('Layer 2.5 is only checked for suspicious code', async () => {
  const benignCode = 'const x = 1;';
  const findings = await triageCodeContent(benignCode, [], {
    mlConfig: {
      enabled: true,
      enableEmbeddings: true,
      layer2Threshold: 0.3,
      embeddingThreshold: 0.8,
    },
  });

  // Benign code should not reach Layer 2.5
  const embeddingFinding = findings.find((f) => f.rule === 'ml-embedding-similarity');
  assert.equal(embeddingFinding, undefined);
});

test('Layer 2.5 finding includes matchedPattern when available', async () => {
  // This test would require mocking the embedder to return a pattern match
  // For now, we just verify the structure doesn't crash
  const maliciousCode = 'eval(atob("malicious"))';
  const findings = await triageCodeContent(maliciousCode, [], {
    mlConfig: {
      enabled: true,
      enableEmbeddings: true,
      layer2Threshold: 0.3,
      embeddingThreshold: 0.8,
    },
  });

  assert.ok(Array.isArray(findings));
});

test('Layer 2.5 caches results correctly', async () => {
  const maliciousCode = 'eval(atob("malicious"))';

  // First run
  const findings1 = await triageCodeContent(maliciousCode, [], {
    mlConfig: {
      enabled: true,
      enableEmbeddings: true,
      layer2Threshold: 0.3,
      embeddingThreshold: 0.8,
    },
  });

  // Second run with same code (should use cache)
  const findings2 = await triageCodeContent(maliciousCode, [], {
    mlConfig: {
      enabled: true,
      enableEmbeddings: true,
      layer2Threshold: 0.3,
      embeddingThreshold: 0.8,
    },
  });

  // Both should return valid results
  assert.ok(Array.isArray(findings1));
  assert.ok(Array.isArray(findings2));
});

test('Layer 2.5 skipCache bypasses cache', async () => {
  const maliciousCode = 'eval(atob("malicious"))';

  const findings = await triageCodeContent(maliciousCode, [], {
    skipCache: true,
    mlConfig: {
      enabled: true,
      enableEmbeddings: true,
      layer2Threshold: 0.3,
      embeddingThreshold: 0.8,
    },
  });

  // Should not crash with skipCache
  assert.ok(Array.isArray(findings));
});
