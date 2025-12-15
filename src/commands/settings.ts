/**
 * Settings management command
 */

import { Command } from 'commander';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

interface Settings {
  codingBias: 'guided' | 'balanced' | 'independent';
  taskDifficulty: 'gentle' | 'progressive' | 'challenging';
  autoReview: boolean;
  autoProgress: boolean;
  detailedFeedback: boolean;
}

export const settingsCommand = new Command('settings')
  .description('View or modify learning preferences')
  .option('--coding-bias <type>', 'Set coding bias (guided|balanced|independent)')
  .option('--difficulty <level>', 'Set task difficulty (gentle|progressive|challenging)')
  .option('--auto-review <boolean>', 'Enable/disable automatic code review')
  .option('--auto-progress <boolean>', 'Enable/disable automatic progress tracking')
  .option('--detailed-feedback <boolean>', 'Enable/disable detailed feedback')
  .option('--reset', 'Reset to default settings')
  .action(async (options) => {
    try {
      const settingsPath = join('.codetandem', 'settings.json');

      // Check if settings exist
      let settingsExist = false;
      try {
        await access(settingsPath);
        settingsExist = true;
      } catch {
        console.error(chalk.red('❌ Error: No settings file found'));
        console.log('Run: codetandem init');
        process.exit(1);
      }

      // Read current settings
      const settingsContent = await readFile(settingsPath, 'utf-8');
      let settings: Settings = JSON.parse(settingsContent);

      // If no options provided, just show current settings
      if (!options.codingBias && !options.difficulty && !options.autoReview && 
          !options.autoProgress && !options.detailedFeedback && !options.reset) {
        console.log(chalk.cyan('\n⚙️  Current Settings\n'));
        console.log(`${chalk.bold('Coding Bias:')} ${settings.codingBias}`);
        console.log(chalk.gray('  • guided: More hints and scaffolding'));
        console.log(chalk.gray('  • balanced: Mix of guidance and independence'));
        console.log(chalk.gray('  • independent: Minimal guidance, more exploration'));
        console.log();
        console.log(`${chalk.bold('Task Difficulty:')} ${settings.taskDifficulty}`);
        console.log(chalk.gray('  • gentle: Slow progression, easier tasks'));
        console.log(chalk.gray('  • progressive: Moderate difficulty increase'));
        console.log(chalk.gray('  • challenging: Steep learning curve'));
        console.log();
        console.log(`${chalk.bold('Auto Review:')} ${settings.autoReview ? 'enabled' : 'disabled'}`);
        console.log(`${chalk.bold('Auto Progress:')} ${settings.autoProgress ? 'enabled' : 'disabled'}`);
        console.log(`${chalk.bold('Detailed Feedback:')} ${settings.detailedFeedback ? 'enabled' : 'disabled'}`);
        console.log();
        return;
      }

      // Reset to defaults
      if (options.reset) {
        settings = {
          codingBias: 'balanced',
          taskDifficulty: 'progressive',
          autoReview: true,
          autoProgress: true,
          detailedFeedback: true
        };
        console.log(chalk.yellow('🔄 Reset settings to defaults'));
      }

      // Update settings
      if (options.codingBias) {
        if (!['guided', 'balanced', 'independent'].includes(options.codingBias)) {
          console.error(chalk.red('❌ Error: Invalid coding bias'));
          console.log('Valid options: guided, balanced, independent');
          process.exit(1);
        }
        settings.codingBias = options.codingBias;
        console.log(chalk.green(`✓ Set coding bias to: ${options.codingBias}`));
      }

      if (options.difficulty) {
        if (!['gentle', 'progressive', 'challenging'].includes(options.difficulty)) {
          console.error(chalk.red('❌ Error: Invalid difficulty level'));
          console.log('Valid options: gentle, progressive, challenging');
          process.exit(1);
        }
        settings.taskDifficulty = options.difficulty;
        console.log(chalk.green(`✓ Set task difficulty to: ${options.difficulty}`));
      }

      if (options.autoReview !== undefined) {
        settings.autoReview = options.autoReview === 'true';
        console.log(chalk.green(`✓ Auto review: ${settings.autoReview ? 'enabled' : 'disabled'}`));
      }

      if (options.autoProgress !== undefined) {
        settings.autoProgress = options.autoProgress === 'true';
        console.log(chalk.green(`✓ Auto progress: ${settings.autoProgress ? 'enabled' : 'disabled'}`));
      }

      if (options.detailedFeedback !== undefined) {
        settings.detailedFeedback = options.detailedFeedback === 'true';
        console.log(chalk.green(`✓ Detailed feedback: ${settings.detailedFeedback ? 'enabled' : 'disabled'}`));
      }

      // Save updated settings
      await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
      console.log();
      console.log(chalk.green('✅ Settings updated successfully!'));
      console.log();

    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
