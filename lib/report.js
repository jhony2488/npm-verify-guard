const SEVERITY_ORDER = { high: 3, medium: 2, low: 1 };

export function buildReport(findings) {
  const summary = {
    total: findings.length,
    high: 0,
    medium: 0,
    low: 0,
    blocking: 0,
  };

  for (const finding of findings) {
    summary[finding.severity] += 1;
    if (finding.blocking) {
      summary.blocking += 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    summary,
    findings: findings.sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]),
  };
}

export function shouldBlock(report, projectConfig) {
  if (report.summary.blocking > 0) {
    return true;
  }

  if (projectConfig.blockOnHigh && report.summary.high > 0) {
    return true;
  }

  if (projectConfig.blockOnMedium && report.summary.medium > 0) {
    return true;
  }

  return false;
}

export function printReport(report, { quiet = false } = {}) {
  if (quiet && report.summary.total === 0) {
    return;
  }

  const { summary } = report;
  console.log('\nnpm-verify report');
  console.log('=================');
  console.log(`Total findings: ${summary.total}`);
  console.log(`  high:   ${summary.high}`);
  console.log(`  medium: ${summary.medium}`);
  console.log(`  low:    ${summary.low}`);

  if (summary.total === 0) {
    console.log('\nNo threats detected.\n');
    return;
  }

  console.log('\nFindings:\n');
  for (const finding of report.findings) {
    console.log(`[${finding.severity.toUpperCase()}] ${finding.source} :: ${finding.rule}`);
    if (finding.package) {
      console.log(`  package: ${finding.package}`);
    }
    if (finding.file) {
      console.log(`  file:    ${finding.file}`);
    }
    if (finding.detail) {
      console.log(`  detail:  ${finding.detail}`);
    }
    if (finding.mlScore !== undefined) {
      console.log(`  mlScore: ${finding.mlScore.toFixed(2)} (layer ${finding.mlLayer})`);
    }
    if (finding.snippet) {
      console.log(`  snippet: ${finding.snippet.slice(0, 120)}`);
    }
    console.log('');
  }
}

export function getExitCode(report, projectConfig) {
  if (shouldBlock(report, projectConfig)) {
    return 1;
  }
  return 0;
}
