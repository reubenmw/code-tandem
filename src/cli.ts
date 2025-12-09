#!/usr/bin/env node

/**
 * CodeTandem CLI Entry Point
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('codetandem')
  .description('AI-powered collaborative coding CLI tool')
  .version(packageJson.version);

// Placeholder for commands - will be implemented in later tasks
program
  .command('info')
  .description('Display project information')
  .action(() => {
    console.log('CodeTandem v' + packageJson.version);
    console.log('Node.js version conversion in progress...');
  });

program.parse(process.argv);
