import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReport, getExitCode, shouldBlock } from '../lib/report.js';

test('buildReport sorts findings by severity', () => {
  const report = buildReport([
    { severity: 'low', blocking: false },
    { severity: 'high', blocking: true },
    { severity: 'medium', blocking: false },
  ]);

  assert.equal(report.summary.total, 3);
  assert.equal(report.summary.high, 1);
  assert.equal(report.summary.medium, 1);
  assert.equal(report.summary.low, 1);
  assert.equal(report.summary.blocking, 1);
  assert.equal(report.findings[0].severity, 'high');
  assert.equal(report.findings[2].severity, 'low');
});

test('shouldBlock blocks on explicit blocking findings', () => {
  const report = buildReport([{ severity: 'low', blocking: true }]);
  assert.equal(shouldBlock(report, { blockOnHigh: false, blockOnMedium: false }), true);
});

test('shouldBlock blocks high severity when blockOnHigh is enabled', () => {
  const report = buildReport([{ severity: 'high', blocking: false }]);
  assert.equal(shouldBlock(report, { blockOnHigh: true, blockOnMedium: false }), true);
});

test('getExitCode returns 1 when report should block', () => {
  const report = buildReport([{ severity: 'high', blocking: true }]);
  assert.equal(getExitCode(report, { blockOnHigh: true, blockOnMedium: false }), 1);
});

test('getExitCode returns 0 for clean report', () => {
  const report = buildReport([]);
  assert.equal(getExitCode(report, { blockOnHigh: true, blockOnMedium: true }), 0);
});
