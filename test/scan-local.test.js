import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { scanLocal, HEURISTIC_RULES } from '../lib/scan-local.js';
import { matchNewsAlerts, normalizeFeedItems } from '../lib/scan-external.js';
import { buildReport, shouldBlock } from '../lib/report.js';
import { isStale } from '../lib/lock.js';

test('heuristic rules detect eval usage', () => {
  const rule = HEURISTIC_RULES.find((entry) => entry.id === 'eval-usage');
  assert.match('const x = eval(code);', rule.pattern);
});

test('scanLocal flags suspicious package content', async () => {
  const projectRoot = join(tmpdir(), `npm-verify-test-${Date.now()}`);
  const packageDir = join(projectRoot, 'node_modules', 'evil-pkg');
  await mkdir(packageDir, { recursive: true });
  await writeFile(join(packageDir, 'index.js'), "eval('alert(1)');", 'utf8');
  await writeFile(join(projectRoot, 'package.json'), '{"name":"test-app","version":"1.0.0"}', 'utf8');

  const findings = await scanLocal(projectRoot, {
    allowPackages: [],
    ignorePaths: [],
    heuristics: { maxFileSizeKb: 512 },
  });

  assert.ok(findings.some((finding) => finding.rule === 'eval-usage'));
});

test('matchNewsAlerts correlates dependency names', () => {
  const findings = matchNewsAlerts(
    [{ title: 'Attack on lodash package', description: 'Supply chain incident' }],
    [{ name: 'lodash', version: '4.17.21' }],
  );

  assert.equal(findings.length, 1);
  assert.equal(findings[0].package, 'lodash');
});

test('normalizeFeedItems parses rss channel items', () => {
  const items = normalizeFeedItems({
    rss: {
      channel: {
        item: [{ title: 'Security alert', description: 'npm package compromised' }],
      },
    },
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Security alert');
});

test('shouldBlock respects project config', () => {
  const report = buildReport([
    { severity: 'medium', blocking: false },
  ]);

  assert.equal(shouldBlock(report, { blockOnMedium: false, blockOnHigh: true }), false);
  assert.equal(shouldBlock(report, { blockOnMedium: true, blockOnHigh: true }), true);
});

test('isStale detects old checks', () => {
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  assert.equal(isStale(old, 24), true);
  assert.equal(isStale(new Date().toISOString(), 24), false);
});
