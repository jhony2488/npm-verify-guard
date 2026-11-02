import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, join, relative } from 'node:path';
import {
  fileExists,
  getDataPath,
  getProjectPaths,
  matchesIgnorePattern,
  loadGlobalConfig,
} from './config.js';
import { triageCodeContent } from './ml/triage-code.js';

const SCANNABLE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.json']);
const LIFECYCLE_SCRIPTS = ['preinstall', 'install', 'postinstall', 'preprepare', 'prepare'];

const HEURISTIC_RULES = [
  {
    id: 'eval-usage',
    severity: 'high',
    pattern: /\beval\s*\(/,
    message: 'Dynamic eval() detected',
  },
  {
    id: 'function-constructor',
    severity: 'high',
    pattern: /(?:new\s+Function\s*\(|Function\s*\(\s*['"`]return)/,
    message: 'Function constructor with dynamic code detected',
  },
  {
    id: 'base64-buffer',
    severity: 'medium',
    pattern: /Buffer\.from\s*\(\s*['"`][A-Za-z0-9+/=]{80,}['"`]\s*,\s*['"`]base64['"`]\s*\)/,
    message: 'Large base64-encoded buffer detected',
  },
  {
    id: 'env-exfiltration',
    severity: 'high',
    pattern: /process\.env[\s\S]{0,200}(?:fetch\s*\(|https?\.request\s*\(|http\.request\s*\()/,
    message: 'Possible environment variable exfiltration',
  },
  {
    id: 'obfuscated-url',
    severity: 'medium',
    pattern:
      /(?:atob|Buffer\.from)\s*\([\s\S]{0,80}\)[\s\S]{0,80}(?:fetch\s*\(|https?\.request\s*\()/,
    message: 'Possible obfuscated outbound request',
  },
];

const SENSITIVE_DATA_RULES = [
  {
    id: 'btc-address',
    severity: 'medium',
    pattern: /\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\b/,
    message: 'Bitcoin address detected',
  },
  {
    id: 'eth-address',
    severity: 'medium',
    pattern: /\b0x[a-fA-F0-9]{40}\b/,
    message: 'Ethereum address detected',
  },
  {
    id: 'aws-access-key',
    severity: 'high',
    pattern: /AKIA[0-9A-Z]{16}/,
    message: 'AWS access key detected',
  },
  {
    id: 'aws-secret-key',
    severity: 'high',
    pattern: /[a-zA-Z0-9+/]{40}/,
    message: 'Possible AWS secret key detected',
  },
  {
    id: 'github-token',
    severity: 'high',
    pattern: /ghp_[a-zA-Z0-9]{36}/,
    message: 'GitHub personal access token detected',
  },
  {
    id: 'stripe-api-key',
    severity: 'high',
    pattern: /sk_live_[a-zA-Z0-9]{24,}/,
    message: 'Stripe live API key detected',
  },
  {
    id: 'slack-token',
    severity: 'high',
    pattern: /xox[baprs]-[a-zA-Z0-9-]+/,
    message: 'Slack token detected',
  },
  {
    id: 'password-in-code',
    severity: 'high',
    pattern: /(?:password|passwd|secret)\s*[=:]\s*['"`][^'"`]{8,}['"`]/i,
    message: 'Hardcoded password detected',
  },
  {
    id: 'api-key-pattern',
    severity: 'high',
    pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*['"`][a-zA-Z0-9_-]{20,}['"`]/i,
    message: 'Hardcoded API key detected',
  },
  {
    id: 'private-key',
    severity: 'high',
    pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
    message: 'Private key detected',
  },
  {
    id: 'ssh-key',
    severity: 'high',
    pattern: /ssh-(?:rsa|ed25519|dss)\s+[a-zA-Z0-9]+/,
    message: 'SSH private key detected',
  },
  {
    id: 'credit-card',
    severity: 'high',
    pattern:
      /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/,
    message: 'Possible credit card number detected',
  },
  {
    id: 'iban',
    severity: 'medium',
    pattern: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}\b/,
    message: 'IBAN bank account number detected',
  },
];

const SCRIPT_SUSPICION = /(?:curl|wget|powershell|Invoke-WebRequest|https?:\/\/|\beval\b|base64)/i;

export async function scanLocal(projectRoot, projectConfig, options = {}) {
  const paths = getProjectPaths(projectRoot);
  const findings = [];

  if (!(await fileExists(paths.nodeModules))) {
    return findings;
  }

  const globalConfig = await loadGlobalConfig();
  const mlConfig = {
    ...globalConfig.ml,
    ...projectConfig.ml,
  };
  const scanOptions = { ...options, mlConfig };

  const malwareHashes = await loadMalwareHashes();
  await walkDirectory(
    paths.nodeModules,
    paths.nodeModules,
    projectConfig,
    malwareHashes,
    findings,
    scanOptions,
  );
  await scanDependencyScripts(paths.nodeModules, projectConfig, findings);

  return findings;
}

async function loadMalwareHashes() {
  try {
    const raw = await readFile(getDataPath('malware-hashes.json'), 'utf8');
    const data = JSON.parse(raw);
    return new Set(data.hashes ?? []);
  } catch {
    return new Set();
  }
}

async function walkDirectory(
  currentDir,
  nodeModulesRoot,
  projectConfig,
  malwareHashes,
  findings,
  scanOptions,
) {
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(currentDir, entry.name);
    const relativePath = relative(nodeModulesRoot, fullPath).replace(/\\/g, '/');

    if (matchesIgnorePattern(relativePath, projectConfig.ignorePaths ?? [])) {
      continue;
    }

    if (entry.isDirectory()) {
      if (entry.name === '.bin') {
        continue;
      }
      await walkDirectory(
        fullPath,
        nodeModulesRoot,
        projectConfig,
        malwareHashes,
        findings,
        scanOptions,
      );
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = getExtension(entry.name);
    if (!SCANNABLE_EXTENSIONS.has(ext)) {
      continue;
    }

    const packageName = extractPackageName(relativePath);
    if (projectConfig.allowPackages?.includes(packageName)) {
      continue;
    }

    const fileStat = await stat(fullPath);
    const maxBytes = (projectConfig.heuristics?.maxFileSizeKb ?? 512) * 1024;
    if (fileStat.size > maxBytes) {
      continue;
    }

    const content = await readFile(fullPath, 'utf8');
    const layer1Findings = analyzeContentLayer1(content, {
      packageName,
      file: relativePath,
      fullPath,
      malwareHashes,
    });

    const sensitiveDataFindings = analyzeSensitiveData(
      content,
      {
        packageName,
        file: relativePath,
        fullPath,
      },
      projectConfig,
    );

    findings.push(...sensitiveDataFindings);

    if (scanOptions.mlConfig?.enabled !== false) {
      const triaged = await triageCodeContent(content, layer1Findings, {
        ...scanOptions,
        packageName,
        filePath: relativePath,
      });
      for (const finding of triaged) {
        finding.package = finding.package ?? packageName;
        finding.file = finding.file ?? relativePath;
        findings.push(finding);
      }
    } else {
      findings.push(...layer1Findings);
    }
  }
}

function analyzeContentLayer1(content, context) {
  const layer1Findings = [];

  for (const rule of HEURISTIC_RULES) {
    const match = content.match(rule.pattern);
    if (match) {
      layer1Findings.push({
        severity: rule.severity,
        source: 'local',
        rule: rule.id,
        package: context.packageName,
        file: context.file,
        detail: rule.message,
        snippet: match[0],
        blocking: rule.severity === 'high',
      });
    }
  }

  const hash = createHash('sha256').update(content).digest('hex');
  if (context.malwareHashes.has(hash)) {
    layer1Findings.push({
      severity: 'high',
      source: 'local',
      rule: 'known-malware-hash',
      package: context.packageName,
      file: context.file,
      detail: `File hash matches known malware list (${hash})`,
      blocking: true,
    });
  }

  return layer1Findings;
}

function analyzeSensitiveData(content, context, projectConfig) {
  const sensitiveFindings = [];

  if (projectConfig.sensitiveData?.enabled === false) {
    return sensitiveFindings;
  }

  for (const rule of SENSITIVE_DATA_RULES) {
    const match = content.match(rule.pattern);
    if (match) {
      sensitiveFindings.push({
        severity: rule.severity,
        source: 'local',
        rule: rule.id,
        package: context.packageName,
        file: context.file,
        detail: rule.message,
        snippet: match[0].slice(0, 50),
        blocking: rule.severity === 'high',
      });
    }
  }

  return sensitiveFindings;
}

async function scanDependencyScripts(nodeModulesRoot, projectConfig, findings) {
  const packageNames = await listInstalledPackages(nodeModulesRoot);

  for (const packageName of packageNames) {
    if (projectConfig.allowPackages?.includes(packageName)) {
      continue;
    }

    const packageJsonPath = join(nodeModulesRoot, ...packageName.split('/'), 'package.json');
    if (!(await fileExists(packageJsonPath))) {
      continue;
    }

    const pkg = JSON.parse(await readFile(packageJsonPath, 'utf8'));
    const scripts = pkg.scripts ?? {};

    for (const scriptName of LIFECYCLE_SCRIPTS) {
      const scriptBody = scripts[scriptName];
      if (!scriptBody || !SCRIPT_SUSPICION.test(scriptBody)) {
        continue;
      }

      findings.push({
        severity: 'medium',
        source: 'local',
        rule: 'suspicious-lifecycle-script',
        package: packageName,
        file: join(packageName, 'package.json'),
        detail: `Suspicious ${scriptName} script in dependency`,
        snippet: scriptBody.slice(0, 120),
        blocking: false,
      });
    }
  }
}

async function listInstalledPackages(nodeModulesRoot) {
  const packages = [];
  const entries = await readdir(nodeModulesRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }

    if (entry.name.startsWith('@')) {
      const scopeDir = join(nodeModulesRoot, entry.name);
      const scopedEntries = await readdir(scopeDir, { withFileTypes: true });
      for (const scopedEntry of scopedEntries) {
        if (scopedEntry.isDirectory()) {
          packages.push(`${entry.name}/${scopedEntry.name}`);
        }
      }
      continue;
    }

    packages.push(entry.name);
  }

  return packages;
}

function extractPackageName(relativePath) {
  const parts = relativePath.split('/');
  if (parts[0]?.startsWith('@') && parts[1]) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0] ?? 'unknown';
}

function getExtension(fileName) {
  const ext = basename(fileName).slice(fileName.lastIndexOf('.'));
  return ext.includes('.') ? ext : '';
}

export { HEURISTIC_RULES, SENSITIVE_DATA_RULES };
