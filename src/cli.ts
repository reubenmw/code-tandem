#!/usr/bin/env node

/**
 * CodeTandem CLI Entry Point
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  configCommand,
  initCommand,
  generateCurriculumCommand,
  settingsCommand,
  startCommand,
  reviewCommand,
  generateCommand,
  statusCommand,
  listCommand,
  testCommand,
  hintCommand,
  solveCommand,
  submitCommand,
  setLevelCommand,
  setupCommand,
} from './commands/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('codetandem')
  .description('AI-powered collaborative coding CLI tool')
  .version(packageJson.version, '-v, --version', 'Show version number');

// Add all commands
program.addCommand(configCommand);
program.addCommand(initCommand);
program.addCommand(generateCurriculumCommand);
program.addCommand(settingsCommand);
program.addCommand(startCommand);
program.addCommand(reviewCommand);
program.addCommand(generateCommand);
program.addCommand(statusCommand);
program.addCommand(listCommand);
program.addCommand(testCommand);
program.addCommand(hintCommand);
program.addCommand(solveCommand);
program.addCommand(submitCommand);
program.addCommand(setLevelCommand);
program.addCommand(setupCommand);

// Info command for testing
program
  .command('info')
  .description('Display project information')
  .action(() => {
    console.log('CodeTandem v' + packageJson.version);
    console.log('Node.js version: ' + process.version);
  });

program.parse(process.argv);
