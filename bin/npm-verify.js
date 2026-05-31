#!/usr/bin/env node

import { runCli } from '../lib/cli.js';

runCli(process.argv.slice(2)).catch((error) => {
  console.error(`npm-verify: ${error.message}`);
  process.exit(2);
});
