import { readFile, writeFile } from 'node:fs/promises';
import { getProjectPaths, fileExists } from './config.js';

const HOOK_COMMAND = 'npm-verify';
const HOOKS = {
  postinstall: `${HOOK_COMMAND} check --blocking`,
  prestart: `${HOOK_COMMAND} gate`,
  predev: `${HOOK_COMMAND} gate`,
  pretest: `${HOOK_COMMAND} gate`,
};

export async function isMonitoredProject(projectRoot) {
  const paths = getProjectPaths(projectRoot);
  if (!(await fileExists(paths.packageJson))) {
    return false;
  }

  const pkg = JSON.parse(await readFile(paths.packageJson, 'utf8'));
  const scripts = pkg.scripts ?? {};
  return Object.entries(HOOKS).some(([name, command]) => scripts[name] === command);
}

export async function initProject(projectRoot, { force = false } = {}) {
  const paths = getProjectPaths(projectRoot);

  if (!(await fileExists(paths.packageJson))) {
    throw new Error('package.json not found in current directory');
  }

  const pkg = JSON.parse(await readFile(paths.packageJson, 'utf8'));
  pkg.scripts = pkg.scripts ?? {};

  for (const [name, command] of Object.entries(HOOKS)) {
    if (pkg.scripts[name] && pkg.scripts[name] !== command && !force) {
      throw new Error(`Script "${name}" already exists. Re-run with --force to overwrite.`);
    }
    pkg.scripts[name] = command;
  }

  await writeFile(paths.packageJson, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

  if (!(await fileExists(paths.projectConfig))) {
    await writeFile(
      paths.projectConfig,
      `${JSON.stringify(
        {
          allowPackages: [],
          ignorePaths: ['**/test/**', '**/docs/**', '**/.bin/**'],
          heuristics: { maxFileSizeKb: 512 },
          external: { enabled: true },
          blockOnMedium: false,
          blockOnHigh: true,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  }
}

export { HOOKS };
