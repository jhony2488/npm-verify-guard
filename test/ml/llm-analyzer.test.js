import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLlmStatus,
  initializeLlmProvider,
  parseLlmResponse,
  convertLlmFindingToFinding,
} from '../lib/ml/llm-analyzer.js';

test('getLlmStatus returns status object', async () => {
  const status = await getLlmStatus();
  assert.ok(typeof status === 'object');
  assert.ok(typeof status.nodeLlamaCppAvailable === 'boolean');
  assert.ok(typeof status.openaiCompatibleAvailable === 'boolean');
  assert.ok(typeof status.modelsDir === 'string');
});

test('initializeLlmProvider with auto falls back gracefully', async () => {
  const result = await initializeLlmProvider({ provider: 'auto' });
  assert.ok(typeof result.available === 'boolean');
  assert.ok(typeof result.provider === 'string' || result.provider === null);
});

test('initializeLlmProvider with node-llama-cpp when not installed', async () => {
  const result = await initializeLlmProvider({ provider: 'node-llama-cpp' });
  assert.strictEqual(result.available, false);
  assert.strictEqual(result.provider, 'node-llama-cpp');
  assert.ok(result.error);
});

test('initializeLlmProvider with openai-compatible without config', async () => {
  const result = await initializeLlmProvider({ provider: 'openai-compatible' });
  assert.strictEqual(result.available, false);
  assert.strictEqual(result.provider, null);
  assert.ok(result.error);
});

test('parseLlmResponse extracts JSON from response', () => {
  const response =
    'Some text {"isMalicious": true, "severity": "high", "reasoning": "test"} more text';
  const parsed = parseLlmResponse(response);
  assert.ok(parsed);
  assert.strictEqual(parsed.isMalicious, true);
  assert.strictEqual(parsed.severity, 'high');
});

test('parseLlmResponse returns null for invalid JSON', () => {
  const response = 'No JSON here';
  const parsed = parseLlmResponse(response);
  assert.strictEqual(parsed, null);
});

test('parseLlmResponse returns null for empty response', () => {
  const parsed = parseLlmResponse('');
  assert.strictEqual(parsed, null);
});

test('convertLlmFindingToFinding with malicious result', () => {
  const llmResult = {
    isMalicious: true,
    severity: 'high',
    reasoning: 'Test reasoning',
    detectedPatterns: ['eval', 'exfiltration'],
  };

  const context = { package: 'test-package', file: 'test.js' };
  const findings = convertLlmFindingToFinding(llmResult, context);

  assert.ok(Array.isArray(findings));
  assert.strictEqual(findings.length, 1);
  assert.strictEqual(findings[0].severity, 'high');
  assert.strictEqual(findings[0].rule, 'llm-code-analysis');
  assert.strictEqual(findings[0].blocking, true);
  assert.strictEqual(findings[0].mlLayer, 4);
});

test('convertLlmFindingToFinding with sensitive data result', () => {
  const llmResult = {
    hasSensitiveData: true,
    detectedTypes: ['api-key', 'password'],
    severity: 'high',
    reasoning: 'Found sensitive data',
  };

  const context = { package: 'test-package', file: 'test.js' };
  const findings = convertLlmFindingToFinding(llmResult, context);

  assert.ok(Array.isArray(findings));
  assert.strictEqual(findings.length, 1);
  assert.strictEqual(findings[0].severity, 'high');
  assert.strictEqual(findings[0].rule, 'llm-sensitive-data');
  assert.strictEqual(findings[0].blocking, true);
});

test('convertLlmFindingToFinding with benign result', () => {
  const llmResult = {
    isMalicious: false,
    severity: 'none',
    reasoning: 'No issues found',
  };

  const context = { package: 'test-package', file: 'test.js' };
  const findings = convertLlmFindingToFinding(llmResult, context);

  assert.ok(Array.isArray(findings));
  assert.strictEqual(findings.length, 0);
});

test('convertLlmFindingToFinding with null result', () => {
  const context = { package: 'test-package', file: 'test.js' };
  const findings = convertLlmFindingToFinding(null, context);

  assert.strictEqual(findings, null);
});

test('convertLlmFindingToFinding with medium severity', () => {
  const llmResult = {
    isMalicious: true,
    severity: 'medium',
    reasoning: 'Suspicious code',
  };

  const context = { package: 'test-package', file: 'test.js' };
  const findings = convertLlmFindingToFinding(llmResult, context);

  assert.strictEqual(findings.length, 1);
  assert.strictEqual(findings[0].severity, 'medium');
  assert.strictEqual(findings[0].blocking, false);
});
