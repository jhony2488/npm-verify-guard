import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(__dirname, '..');

export const GLOBAL_DIR = join(homedir(), '.npm-verify');
export const GLOBAL_CONFIG_PATH = join(GLOBAL_DIR, 'config.json');
export const GLOBAL_CACHE_DIR = join(GLOBAL_DIR, 'cache');
export const GLOBAL_LOG_DIR = join(GLOBAL_DIR, 'logs');
export const PROJECT_CONFIG_NAME = '.npm-verify.json';
export const STATUS_FILE_NAME = 'status.json';
export const REPORT_FILE_NAME = 'report.json';

const DEFAULT_GLOBAL_CONFIG = {
  watchedProjects: [],
  intervalHours: 1,
  notifyOnThreat: true,
  ml: {
    useOnnx: true,
    modelsDir: null,
  },
};

const DEFAULT_PROJECT_CONFIG = {
  allowPackages: [],
  ignorePaths: ['**/test/**', '**/docs/**', '**/.bin/**'],
  heuristics: { maxFileSizeKb: 512 },
  external: { enabled: true },
  blockOnMedium: false,
  blockOnHigh: true,
  ml: {
    enabled: true,
    layer2Threshold: 0.7,
    layer2MediumThreshold: 0.3,
    layer3Threshold: 0.8,
    tfidfThreshold: 2.5,
    newsLayer2Threshold: 0.45,
    deepScanOnInstall: false,
    useOnnx: true,
    blockOnMedium: false,
  },
};

export async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function ensureGlobalDirs() {
  await mkdir(GLOBAL_DIR, { recursive: true });
  await mkdir(GLOBAL_CACHE_DIR, { recursive: true });
  await mkdir(GLOBAL_LOG_DIR, { recursive: true });
}

export async function loadGlobalConfig() {
  await ensureGlobalDirs();
  if (!(await fileExists(GLOBAL_CONFIG_PATH))) {
    await writeFile(GLOBAL_CONFIG_PATH, `${JSON.stringify(DEFAULT_GLOBAL_CONFIG, null, 2)}\n`, 'utf8');
    return structuredClone(DEFAULT_GLOBAL_CONFIG);
  }

  const raw = await readFile(GLOBAL_CONFIG_PATH, 'utf8');
  return { ...DEFAULT_GLOBAL_CONFIG, ...JSON.parse(raw) };
}

export async function saveGlobalConfig(config) {
  await ensureGlobalDirs();
  await writeFile(GLOBAL_CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

export async function loadProjectConfig(projectRoot) {
  const configPath = join(projectRoot, PROJECT_CONFIG_NAME);
  if (!(await fileExists(configPath))) {
    return structuredClone(DEFAULT_PROJECT_CONFIG);
  }

  const raw = await readFile(configPath, 'utf8');
  return deepMerge(DEFAULT_PROJECT_CONFIG, JSON.parse(raw));
}

export function getProjectPaths(projectRoot) {
  const root = resolve(projectRoot);
  return {
    root,
    nodeModules: join(root, 'node_modules'),
    packageJson: join(root, 'package.json'),
    packageLock: join(root, 'package-lock.json'),
    verifyDir: join(root, '.npm-verify'),
    statusFile: join(root, '.npm-verify', STATUS_FILE_NAME),
    reportFile: join(root, '.npm-verify', REPORT_FILE_NAME),
    projectConfig: join(root, PROJECT_CONFIG_NAME),
  };
}

export function getDataPath(relativePath) {
  return join(PACKAGE_ROOT, 'data', relativePath);
}

function deepMerge(base, override) {
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object') {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function matchesIgnorePattern(relativePath, patterns) {
  const normalized = relativePath.replace(/\\/g, '/');
  return patterns.some((pattern) => {
    const regex = globToRegExp(pattern);
    return regex.test(normalized);
  });
}

function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/\\/g, '/')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '___GLOBSTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___GLOBSTAR___/g, '.*');
  return new RegExp(`^${escaped}$`);
}
