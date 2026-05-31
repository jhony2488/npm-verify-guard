import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReport, printReport } from '../lib/report.js';

test('printReport handles empty findings without throwing', () => {
  const report = buildReport([]);
  assert.doesNotThrow(() => printReport(report));
});

test('printReport handles quiet mode with no output logic errors', () => {
  const report = buildReport([]);
  assert.doesNotThrow(() => printReport(report, { quiet: true }));
});

test('printReport renders mlScore metadata', () => {
  const report = buildReport([
    {
      severity: 'high',
      source: 'local',
      rule: 'ml-naive-bayes',
      detail: 'test',
      mlScore: 0.91,
      mlLayer: 2,
      blocking: true,
    },
  ]);

  assert.doesNotThrow(() => printReport(report));
  assert.equal(report.findings[0].mlScore, 0.91);
});

test('buildReport counts multiple blocking findings', () => {
  const report = buildReport([
    { severity: 'high', blocking: true },
    { severity: 'medium', blocking: true },
    { severity: 'low', blocking: false },
  ]);

  assert.equal(report.summary.blocking, 2);
});
