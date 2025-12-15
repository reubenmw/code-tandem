/**
 * Export all commands
 */

export { configCommand } from './config.js';
export { initCommand } from './init.js';

// Placeholder exports for commands to be implemented
import { Command } from 'commander';
import chalk from 'chalk';

export const nextCommand = new Command('next')
  .description('Get the next task from the curriculum')
  .action(() => {
    console.log(chalk.yellow('Command not yet implemented'));
    console.log('This will fetch and display the next learning task');
  });

export const testCommand = new Command('test')
  .description('Run tests for the current task')
  .action(() => {
    console.log(chalk.yellow('Command not yet implemented'));
    console.log('This will run tests against your solution');
  });

export const hintCommand = new Command('hint')
  .description('Get a hint for the current task')
  .action(() => {
    console.log(chalk.yellow('Command not yet implemented'));
    console.log('This will provide AI-generated hints');
  });

export const solveCommand = new Command('solve')
  .description('Let AI solve the current task')
  .action(() => {
    console.log(chalk.yellow('Command not yet implemented'));
    console.log('This will generate a complete solution');
  });

export const submitCommand = new Command('submit')
  .description('Submit your solution for review')
  .option('-f, --file <path>', 'Path to solution file')
  .action(() => {
    console.log(chalk.yellow('Command not yet implemented'));
    console.log('This will review and grade your solution');
  });

export const setLevelCommand = new Command('set-level')
  .description('Override the difficulty level')
  .argument('<level>', 'Difficulty level (easy, medium, hard)')
  .action(() => {
    console.log(chalk.yellow('Command not yet implemented'));
    console.log('This will set the difficulty override');
  });
