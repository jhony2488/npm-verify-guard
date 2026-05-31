import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCli } from '../lib/cli.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

function printEarlyHelp() {
  console.log(`npm-verify-guard v${pkg.version}

Quick start:
  npm-verify init
  npm-verify check --blocking
  npm-verify gate

Run "npm-verify help" for all commands.`);
}

async function main() {
  const argv = process.argv.slice(2);

  if (argv.length === 0) {
    printEarlyHelp();
    process.exit(0);
  }

  if (argv.includes('--version') || argv.includes('-V') || argv[0] === 'version') {
    console.log(pkg.version);
    process.exit(0);
  }

  const code = await runCli(argv);
  process.exit(code ?? 0);
}

main().catch((error) => {
  if (error?.stack && process.env.NPM_VERIFY_DEBUG === '1') {
    console.error(error.stack);
  }
  console.error(`npm-verify: ${error.message}`);
  process.exit(2);
});
