/**
 * Project initialization command
 */

import { Command } from 'commander';
import { writeFile, access, mkdir } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';

const DEFAULT_LRD = `# Learning Goal

Describe what you want to learn and build.

## My Background

- Current skill level (beginner/intermediate/advanced)
- What programming languages/technologies I already know
- How I learn best (projects, tutorials, exercises, etc.)

## What I Want to Learn

- Primary goal or technology
- Specific skills or concepts
- Any particular frameworks or tools
- End goal or project idea

## Learning Preferences

- Preferred coding bias (more guidance vs more independence)
- Task difficulty preference (gentle learning curve vs challenging)
- Time commitment (hours per week)

## Project Requirements (Optional)

What you want to build by the end:
- Feature 1
- Feature 2
- Feature 3
`;

export const initCommand = new Command('init')
  .description('Initialize a CodeTandem project')
  .option('-p, --project <path>', 'Path to the project directory', '.')
  .option('--force', 'Overwrite existing files')
  .action(async (options) => {
    try {
      const projectPath = options.project;
      const lrdPath = join(projectPath, 'lrd.md');
      const codetandemDir = join(projectPath, '.codetandem');
      const settingsPath = join(codetandemDir, 'settings.json');

      console.log(chalk.cyan('🚀 Initializing CodeTandem project...'));
      console.log();

      // Create .codetandem directory
      await mkdir(codetandemDir, { recursive: true });
      console.log(chalk.green('   ✓ Created .codetandem directory'));

      // Check if LRD exists, create default if not
      let lrdExists = false;
      try {
        await access(lrdPath);
        lrdExists = true;
      } catch {
        // LRD doesn't exist
      }

      if (!lrdExists || options.force) {
        console.log(chalk.yellow('📝 Creating Learning Requirements Document (lrd.md)...'));
        await writeFile(lrdPath, DEFAULT_LRD, 'utf-8');
        console.log(chalk.green('   ✓ Created lrd.md'));
      } else {
        console.log(chalk.green('   ✓ Found existing lrd.md'));
      }

      // Create default settings
      const defaultSettings = {
        codingBias: 'balanced', // 'guided' | 'balanced' | 'independent'
        taskDifficulty: 'progressive', // 'gentle' | 'progressive' | 'challenging'
        autoReview: true,
        autoProgress: true,
        detailedFeedback: true,
      };

      let settingsExists = false;
      try {
        await access(settingsPath);
        settingsExists = true;
      } catch {
        // Settings don't exist
      }

      if (!settingsExists || options.force) {
        console.log(chalk.yellow('⚙️  Creating default settings...'));
        await writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
        console.log(chalk.green('   ✓ Created settings.json'));
      } else {
        console.log(chalk.green('   ✓ Found existing settings.json'));
      }

      console.log();
      console.log(chalk.green('✅ Initialization complete!'));
      console.log();
      console.log(chalk.bold('🎯 Your Learning Journey Starts Here:'));
      console.log();
      console.log(chalk.cyan('Step 1: Define your learning goal'));
      console.log(chalk.gray('   Edit lrd.md with your background and what you want to learn'));
      console.log();
      console.log(chalk.cyan('Step 2: Configure AI provider'));
      console.log(chalk.gray('   codetandem config set-provider openai'));
      console.log(chalk.gray('   codetandem config set-key openai YOUR_API_KEY'));
      console.log();
      console.log(chalk.cyan('Step 3: Generate your custom curriculum'));
      console.log(chalk.gray('   codetandem generate-curriculum'));
      console.log();
      console.log(chalk.cyan('Step 4 (Optional): Adjust learning preferences'));
      console.log(chalk.gray('   codetandem settings --coding-bias guided'));
      console.log(chalk.gray('   codetandem settings --difficulty gentle'));
      console.log();
      console.log(chalk.cyan('Step 5: Start learning!'));
      console.log(chalk.gray('   codetandem start'));
      console.log();
      console.log(chalk.dim('💡 Tip: The AI will automatically track your progress based on'));
      console.log(chalk.dim('   your coding attempts and adjust difficulty accordingly.'));
      console.log();
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
