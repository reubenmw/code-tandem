/**
 * Start coding command - AI-assisted learning session
 */

import { Command } from 'commander';
import { readFile, access } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { getAIProvider } from '../providers/factory.js';
import { ConfigManager } from '../utils/config.js';
import { loadState, getCurrentModuleId, getSkillScore } from '../utils/state.js';
import { loadModules, getModuleById } from '../utils/modules.js';
import { extractTodoCode, findAllTodos } from '../utils/code-parser.js';
import { buildCodingPrompt } from '../utils/tandem.js';

interface Settings {
  codingBias: 'guided' | 'balanced' | 'independent';
  taskDifficulty: 'gentle' | 'progressive' | 'challenging';
  autoReview: boolean;
  autoProgress: boolean;
  detailedFeedback: boolean;
}

export const startCommand = new Command('start')
  .description('Start AI-assisted coding session')
  .argument('[file]', 'Specific file to work on (optional)')
  .option('-o, --objective <index>', 'Focus on specific objective (0-based index)')
  .action(async (file: string | undefined, options) => {
    try {
      // Load state and modules
      const state = await loadState('./codetandem.state.json');
      const modules = await loadModules('./modules.json');
      const currentModule = getModuleById(modules, getCurrentModuleId(state));
      const skillScore = getSkillScore(state, state.currentModuleId);

      // Load settings
      const settingsPath = join('.codetandem', 'settings.json');
      let settings: Settings;
      try {
        const settingsContent = await readFile(settingsPath, 'utf-8');
        settings = JSON.parse(settingsContent);
      } catch {
        // Use defaults if no settings file
        settings = {
          codingBias: 'balanced',
          taskDifficulty: 'progressive',
          autoReview: true,
          autoProgress: true,
          detailedFeedback: true
        };
      }

      // Get AI provider
      const config = new ConfigManager();
      const provider = await config.getProvider();
      const model = await config.getModel();
      const apiKey = await config.getApiKey(provider);

      if (!apiKey) {
        console.error(chalk.red('❌ Error: No API key configured'));
        console.log('Run: codetandem config set-provider <provider>');
        console.log('     codetandem config set-key <provider> <key>');
        process.exit(1);
      }

      const aiProvider = getAIProvider({
        providerName: provider as any,
        model,
        apiKey,
      });

      console.log(chalk.cyan('\n🚀 CodeTandem Learning Session\n'));
      console.log(chalk.bold('Current Module:'), currentModule.title);
      console.log(chalk.bold('Your Skill Score:'), `${skillScore.toFixed(1)}/10.0`);
      console.log(chalk.bold('Coding Bias:'), settings.codingBias);
      console.log(chalk.bold('Difficulty:'), settings.taskDifficulty);
      console.log();

      // If file specified, work with that file
      if (file) {
        // Check if file exists
        try {
          await access(file);
        } catch {
          console.log(chalk.yellow(`⚠️  File doesn't exist yet: ${file}`));
          console.log(chalk.gray('   AI will help you create it.\n'));
        }

        // Find TODOs in file
        const todos = await findAllTodos(file);

        if (todos.length === 0) {
          console.log(chalk.yellow('💡 No TODOs found in this file.'));
          console.log(chalk.gray('   Add TODO comments where you need help:\n'));
          console.log(chalk.cyan('   // TODO: implement user authentication'));
          console.log(chalk.cyan('   # TODO: parse CSV data\n'));
        } else {
          console.log(chalk.green(`📝 Found ${todos.length} TODO(s) in ${file}:\n`));
          todos.forEach(([lineNum, text], i) => {
            console.log(chalk.gray(`   ${i + 1}. Line ${lineNum}: ${text}`));
          });
          console.log();
        }

        // Get guidance for the file
        console.log(chalk.cyan('🤖 Getting AI guidance...\n'));

        const objectiveIndex = options.objective ? parseInt(options.objective) : 0;
        const objective = currentModule.objectives[objectiveIndex];

        // Build context-aware prompt
        const projectContext = {
          state,
          modules,
          currentModule,
          projectPath: '.'
        };

        let fileContent = '';
        try {
          fileContent = await readFile(file, 'utf-8');
        } catch {
          // File doesn't exist yet
        }

        const prompt = buildCodingPrompt(
          projectContext,
          file,
          fileContent,
          objectiveIndex,
          skillScore
        );

        const response = await aiProvider.generateCodeSuggestion(
          prompt,
          {
            filePath: file,
            description: `Working on: ${currentModule.title}`,
            requirements: objective
          },
          0.7
        );

        console.log(chalk.gray('─'.repeat(70)));
        console.log(response.content);
        console.log(chalk.gray('─'.repeat(70)));
        console.log();

        if (settings.autoReview) {
          console.log(chalk.dim('💡 Tip: After implementing, run: codetandem review ' + file));
        }

      } else {
        // No file specified - show module overview
        console.log(chalk.bold('📚 Module Objectives:\n'));
        currentModule.objectives.forEach((obj, i) => {
          console.log(chalk.cyan(`${i + 1}. ${obj}`));
        });
        console.log();

        console.log(chalk.bold('💡 How to proceed:\n'));
        console.log(chalk.gray('1. Create a file for your code (e.g., src/main.py)'));
        console.log(chalk.gray('2. Add TODO comments where you need help'));
        console.log(chalk.gray('3. Run: codetandem start <filename>'));
        console.log();

        console.log(chalk.bold('Example:\n'));
        console.log(chalk.cyan('   # Create a file'));
        console.log(chalk.cyan('   echo "# TODO: implement calculator" > src/calc.py'));
        console.log();
        console.log(chalk.cyan('   # Get AI help'));
        console.log(chalk.cyan('   codetandem start src/calc.py'));
        console.log();

        // Generate general guidance
        console.log(chalk.cyan('🤖 General Guidance for this Module:\n'));

        const prompt = `You are a coding mentor. The student is working on: "${currentModule.title}"

Learning objectives:
${currentModule.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Student's skill level: ${skillScore.toFixed(1)}/10.0
Coding bias: ${settings.codingBias}
Difficulty: ${settings.taskDifficulty}

Provide a brief, encouraging overview of:
1. What they'll learn in this module
2. Suggested approach or starting point
3. Example project structure or files to create

Keep it concise (5-8 lines max) and motivational.`;

        const response = await aiProvider.generateCodeSuggestion(
          prompt,
          {
            description: 'Module overview'
          },
          0.7
        );

        console.log(chalk.gray('─'.repeat(70)));
        console.log(response.content);
        console.log(chalk.gray('─'.repeat(70)));
        console.log();
      }

    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
