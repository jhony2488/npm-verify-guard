import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadGlobalConfig, getProjectPaths, loadProjectConfig } from './config.js';
import { readStatus, setFailed, setOk, setRunning, isStale } from './lock.js';
import { buildReport, getExitCode, printReport, shouldBlock } from './report.js';
import { scanLocal } from './scan-local.js';
import { scanExternal } from './scan-external.js';
import { initProject, isMonitoredProject } from './hooks.js';
import { addWatchedProject, listWatchedProjects, removeWatchedProject } from './watch.js';
import { installScheduler, schedulerStatus, uninstallScheduler } from './scheduler.js';
import { daemonStart, daemonStatus, daemonStop } from './daemon.js';
import { downloadOnnxModels, getModelsStatus } from './ml/model-loader.js';

function parseArgs(argv) {
  const args = {
    command: argv[0] ?? 'help',
    positional: [],
    flags: new Set(),
    options: {},
  };

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      if (value !== undefined) {
        args.options[key] = value;
      } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        args.options[key] = argv[++i];
      } else {
        args.flags.add(key);
      }
    } else {
      args.positional.push(arg);
    }
  }

  return args;
}

function printHelp() {
  console.log(`npm-verify-guard - npm vulnerability and malware verifier

Usage:
  npm-verify init [--force]
  npm-verify check [--blocking] [--deep] [--local-only] [--external-only] [--all-watched] [--quiet]
  npm-verify gate
  npm-verify report
  npm-verify models status|download
  npm-verify watch add|remove|list [path]
  npm-verify scheduler install|uninstall|status
  npm-verify daemon start|stop|status

Exit codes:
  0 = clean
  1 = threat detected / blocked
  2 = configuration or runtime error
`);
}

async function saveReport(reportFile, report) {
  await mkdir(dirname(reportFile), { recursive: true });
  await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function runCheck(projectRoot, options = {}) {
  const paths = getProjectPaths(projectRoot);
  const projectConfig = await loadProjectConfig(projectRoot);
  const globalConfig = await loadGlobalConfig();
  const mlConfig = { ...globalConfig.ml, ...projectConfig.ml };
  const scanOptions = {
    ...options,
    mlConfig,
    deepScan: options.deepScan ?? false,
  };
  const findings = [];

  if (!options.externalOnly) {
    const localFindings = await scanLocal(projectRoot, projectConfig, scanOptions);
    findings.push(...localFindings);
  }

  if (!options.localOnly && projectConfig.external?.enabled !== false) {
    try {
      const externalFindings = await scanExternal(projectRoot, projectConfig, scanOptions);
      findings.push(...externalFindings);
    } catch (error) {
      if (options.blocking) {
        throw error;
      }
      findings.push({
        severity: 'low',
        source: 'external',
        rule: 'external-scan-degraded',
        detail: `External scan failed: ${error.message}`,
        blocking: false,
      });
    }
  }

  const report = buildReport(findings);
  await saveReport(paths.reportFile, report);
  printReport(report, { quiet: options.quiet });

  return { report, projectConfig, paths };
}

async function checkProject(projectRoot, options) {
  if (options.blocking) {
    const paths = getProjectPaths(projectRoot);
    await setRunning(paths.statusFile);
  }

  const { report, projectConfig, paths } = await runCheck(projectRoot, options);

  if (options.blocking) {
    if (shouldBlock(report, projectConfig)) {
      await setFailed(paths.statusFile, report);
    } else {
      await setOk(paths.statusFile, report);
    }
  }

  return getExitCode(report, projectConfig);
}

async function gateProject(projectRoot) {
  const paths = getProjectPaths(projectRoot);

  if (!(await isMonitoredProject(projectRoot))) {
    return 0;
  }

  const status = await readStatus(paths.statusFile);

  if (status?.status === 'running') {
    console.error('npm-verify: verification in progress. Wait before running the project.');
    return 1;
  }

  if (status?.status === 'failed') {
    console.error('npm-verify: threats detected. Run "npm-verify report" and fix issues before starting.');
    return 1;
  }

  if (isStale(status?.checkedAt)) {
    console.log('npm-verify: last check is stale, running quick verification...');
    return checkProject(projectRoot, { blocking: true });
  }

  return 0;
}

export async function runCli(argv) {
  const args = parseArgs(argv);
  const cwd = resolve(process.cwd());

  switch (args.command) {
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      return 0;

    case 'init':
      await initProject(cwd, { force: args.flags.has('force') });
      console.log('npm-verify: project configured with npm hooks.');
      return 0;

    case 'check': {
      const options = {
        blocking: args.flags.has('blocking'),
        deepScan: args.flags.has('deep'),
        localOnly: args.flags.has('local-only'),
        externalOnly: args.flags.has('external-only'),
        quiet: args.flags.has('quiet'),
        fetchFn: globalThis.fetch,
      };

      if (args.flags.has('all-watched')) {
        const config = await loadGlobalConfig();
        let worstExit = 0;
        for (const project of config.watchedProjects) {
          const code = await checkProject(resolve(project), options);
          worstExit = Math.max(worstExit, code);
        }
        return worstExit;
      }

      const code = await checkProject(cwd, options);
      return code;
    }

    case 'gate':
      return gateProject(cwd);

    case 'report': {
      const paths = getProjectPaths(cwd);
      try {
        const raw = await readFile(paths.reportFile, 'utf8');
        const report = JSON.parse(raw);
        printReport(report);
        const projectConfig = await loadProjectConfig(cwd);
        return getExitCode(report, projectConfig);
      } catch {
        console.error('npm-verify: no report found. Run "npm-verify check" first.');
        return 2;
      }
    }

    case 'models': {
      const sub = args.positional[0] ?? 'status';
      if (sub === 'status') {
        const status = await getModelsStatus();
        console.log('npm-verify models status');
        console.log(`  ONNX runtime: ${status.onnxRuntimeAvailable ? 'available' : 'not installed'}`);
        console.log(`  Models dir:   ${status.modelsDir}`);
        for (const [name, downloaded] of Object.entries(status.onnxModels)) {
          console.log(`  ${name}: ${downloaded ? 'downloaded' : 'missing'}`);
        }
        console.log(`  Bundled ML:   ${status.bundledModels.join(', ')}`);
        return 0;
      }
      if (sub === 'download') {
        const results = await downloadOnnxModels((msg) => console.log(msg));
        for (const result of results) {
          console.log(`${result.name}: ${result.status}${result.error ? ` (${result.error})` : ''}`);
        }
        return 0;
      }
      throw new Error(`Unknown models subcommand: ${sub}`);
    }

    case 'watch': {
      const sub = args.positional[0] ?? 'list';
      const target = resolve(args.positional[1] ?? cwd);

      if (sub === 'add') {
        await addWatchedProject(target);
        console.log(`npm-verify: watching ${target}`);
        return 0;
      }
      if (sub === 'remove') {
        await removeWatchedProject(target);
        console.log(`npm-verify: removed ${target}`);
        return 0;
      }
      if (sub === 'list') {
        const projects = await listWatchedProjects();
        if (projects.length === 0) {
          console.log('No watched projects.');
        } else {
          for (const project of projects) {
            console.log(project);
          }
        }
        return 0;
      }
      throw new Error(`Unknown watch subcommand: ${sub}`);
    }

    case 'scheduler': {
      const sub = args.positional[0] ?? 'status';
      if (sub === 'install') {
        await installScheduler();
        console.log('npm-verify: scheduler installed.');
        return 0;
      }
      if (sub === 'uninstall') {
        await uninstallScheduler();
        console.log('npm-verify: scheduler removed.');
        return 0;
      }
      if (sub === 'status') {
        const status = await schedulerStatus();
        console.log(status);
        return 0;
      }
      throw new Error(`Unknown scheduler subcommand: ${sub}`);
    }

    case 'daemon': {
      const sub = args.positional[0] ?? 'status';
      if (sub === 'start') {
        await daemonStart();
        console.log('npm-verify: daemon started.');
        return 0;
      }
      if (sub === 'stop') {
        await daemonStop();
        console.log('npm-verify: daemon stopped.');
        return 0;
      }
      if (sub === 'status') {
        console.log(await daemonStatus());
        return 0;
      }
      throw new Error(`Unknown daemon subcommand: ${sub}`);
    }

    default:
      throw new Error(`Unknown command: ${args.command}`);
  }
}
