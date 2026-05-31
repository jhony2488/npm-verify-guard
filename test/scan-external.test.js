import assert from 'node:assert/strict';
import test from 'node:test';
import { matchNewsAlerts } from '../lib/scan-external.js';

test('matchNewsAlerts ignores unrelated packages', () => {
  const findings = matchNewsAlerts(
    [{ title: 'React security update', description: 'Patch released' }],
    [{ name: 'lodash', version: '4.17.21' }],
  );

  assert.equal(findings.length, 0);
});

test('matchNewsAlerts is case insensitive', () => {
  const findings = matchNewsAlerts(
    [{ title: 'EXPLOIT IN AXIOS LIBRARY', description: 'details' }],
    [{ name: 'axios', version: '1.6.0' }],
  );

  assert.equal(findings.length, 1);
});
