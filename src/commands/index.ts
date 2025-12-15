/**
 * Export all commands
 */

export { configCommand } from './config.js';
export { initCommand } from './init.js';
export { generateCurriculumCommand } from './generate-curriculum.js';
export { settingsCommand } from './settings.js';
export { startCommand } from './start.js';
export { reviewCommand } from './review.js';

// Import utilities
import { Command } from 'commander';
import chalk from 'chalk';
import { generateModulesJson } from '../utils/modules.js';
import { loadState, updateState } from '../utils/state.js';
import { loadModules } from '../utils/modules.js';
import { join } from 'path';

// Generate command - regenerate modules from curriculum
export const generateCommand = new Command('generate')
  .description('Generate modules.json from curriculum file')
  .option('-c, --curriculum <path>', 'Path to curriculum file', './curriculum.md')
  .option('-o, --output <path>', 'Output path for modules.json', './modules.json')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('📚 Generating modules from curriculum...'));
      const modules = await generateModulesJson(options.curriculum, options.output);
      console.log(chalk.green(`✅ Generated ${modules.length} modules`));
      modules.forEach((m, i) => {
        console.log(chalk.gray(`   ${i + 1}. ${m.title} (${m.id})`));
      });
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Status command - show current progress
export const statusCommand = new Command('status')
  .description('Show current project status and progress')
  .option('--detailed', 'Show detailed information')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const state = await loadState('./codetandem.state.json');
      const modules = await loadModules('./modules.json');

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              currentModuleId: state.currentModuleId,
              skillScores: state.skillScores,
              completedModules: state.completedModules,
              totalModules: modules.length,
              progress: (state.completedModules.length / modules.length) * 100,
            },
            null,
            2
          )
        );
        return;
      }

      const currentModule = modules.find((m) => m.id === state.currentModuleId);
      const skillScore = state.skillScores[state.currentModuleId] || 0;
      const progress = (state.completedModules.length / modules.length) * 100;

      console.log(chalk.cyan('\n📊 CodeTandem Status\n'));
      console.log(
        `${chalk.bold('Current Module:')} ${currentModule?.title || state.currentModuleId}`
      );
      console.log(`${chalk.bold('Module ID:')} ${state.currentModuleId}`);
      console.log(`${chalk.bold('Skill Score:')} ${skillScore.toFixed(1)}/10.0`);
      console.log(
        `${chalk.bold('Progress:')} ${state.completedModules.length}/${modules.length} modules (${progress.toFixed(1)}%)`
      );

      if (options.detailed) {
        console.log(`\n${chalk.bold('Completed Modules:')}`);
        if (state.completedModules.length === 0) {
          console.log(chalk.gray('  None yet'));
        } else {
          state.completedModules.forEach((id) => {
            const mod = modules.find((m) => m.id === id);
            console.log(chalk.green(`  ✓ ${mod?.title || id}`));
          });
        }
      }
      console.log();
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List command - list all modules
export const listCommand = new Command('list')
  .description('List all curriculum modules')
  .option('--completed', 'Show only completed modules')
  .option('--remaining', 'Show only remaining modules')
  .action(async (options) => {
    try {
      const modules = await loadModules('./modules.json');
      const state = await loadState('./codetandem.state.json');

      console.log(chalk.cyan('\n📚 Curriculum Modules\n'));

      modules.forEach((mod, i) => {
        const isCompleted = state.completedModules.includes(mod.id);
        const isCurrent = mod.id === state.currentModuleId;

        if (options.completed && !isCompleted) return;
        if (options.remaining && isCompleted) return;

        const icon = isCompleted
          ? chalk.green('✓')
          : isCurrent
            ? chalk.yellow('→')
            : chalk.gray('○');
        const title = isCurrent ? chalk.bold(mod.title) : mod.title;

        console.log(`${icon} ${i + 1}. ${title}`);
        console.log(chalk.gray(`   ID: ${mod.id}`));
      });
      console.log();
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Complete command - DEPRECATED: Modules now auto-complete on AI approval
// Kept for backward compatibility and manual override
export const completeCommand = new Command('complete')
  .description('Mark current module as complete and update progress')
  .option('--force', 'Force completion without AI approval (not recommended)')
  .action(async (options) => {
    try {
      const state = await loadState('./codetandem.state.json');
      const modules = await loadModules('./modules.json');

      const currentModuleId = state.currentModuleId;
      const currentModule = modules.find((m) => m.id === currentModuleId);

      if (!currentModule) {
        console.error(chalk.red('❌ Error: Current module not found'));
        process.exit(1);
      }

      // Check if already completed
      if (state.completedModules.includes(currentModuleId)) {
        console.log(chalk.yellow('⚠️  Module already marked as complete'));
        return;
      }

      // AI-GATED PROGRESSION: Check for AI approval
      const assessmentPending = state.assessmentPending ?? true;
      const skillScore = state.skillScores[currentModuleId] || 0;

      if (!options.force && assessmentPending) {
        console.log(chalk.red('\n🔒 AI APPROVAL REQUIRED\n'));
        console.log(chalk.yellow('You cannot complete this module yet.'));
        console.log(chalk.gray('\nTo proceed, you need:'));
        console.log(chalk.gray('  1. Submit your code for AI review'));
        console.log(chalk.gray('  2. Achieve a score of 7.0 or higher'));
        console.log(chalk.gray('  3. Pass all review requirements'));
        console.log(chalk.gray(`\nCurrent skill score: ${skillScore.toFixed(1)}/10.0`));
        console.log(chalk.cyan('\n💡 Next steps:'));
        console.log(chalk.gray('   Run: codetandem review <file>'));
        console.log(chalk.gray('   Or: codetandem review <file> --todo "TODO text"\n'));
        process.exit(1);
      }

      if (!options.force && skillScore < 7.0) {
        console.log(chalk.red('\n🔒 SKILL SCORE TOO LOW\n'));
        console.log(chalk.yellow(`Current score: ${skillScore.toFixed(1)}/10.0 (need: 7.0+)`));
        console.log(chalk.gray('\nYour code needs improvement before completing this module.'));
        console.log(chalk.cyan('\n💡 Next steps:'));
        console.log(chalk.gray('   1. Review AI feedback from your last review'));
        console.log(chalk.gray('   2. Improve your code based on suggestions'));
        console.log(chalk.gray('   3. Run: codetandem review <file>\n'));
        process.exit(1);
      }

      // Mark as complete
      await updateState('./codetandem.state.json', {
        completedModuleId: currentModuleId,
        assessmentPending: true, // Reset for next module
      });

      console.log(chalk.green('\n✅ Module completed!\n'));
      console.log(chalk.bold('Completed:'), currentModule.title);
      console.log(chalk.bold('Final Score:'), `${skillScore.toFixed(1)}/10.0`);
      console.log(
        chalk.bold('Progress:'),
        `${state.completedModules.length + 1}/${modules.length} modules`
      );
      console.log();
      console.log(chalk.cyan('🎉 Great work! Ready to move forward?'));
      console.log(chalk.gray('   Run: codetandem next'));
      console.log();
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Next command - DEPRECATED: Modules now auto-advance after completion
// Kept for backward compatibility and manual navigation
export const nextCommand = new Command('next')
  .description('Move to the next module in the curriculum')
  .option('--force', 'Skip validation and force move to next module (not recommended)')
  .action(async (options) => {
    try {
      const state = await loadState('./codetandem.state.json');
      const modules = await loadModules('./modules.json');

      const currentModuleId = state.currentModuleId;
      const currentIndex = modules.findIndex((m) => m.id === currentModuleId);

      if (currentIndex === -1) {
        console.error(chalk.red('❌ Error: Current module not found'));
        process.exit(1);
      }

      // VALIDATION: Prevent skipping modules
      if (!options.force && !state.completedModules.includes(currentModuleId)) {
        console.log(chalk.red('\n🔒 CURRENT MODULE NOT COMPLETED\n'));
        console.log(chalk.yellow('You must complete the current module before moving forward.'));
        console.log(chalk.gray(`\nCurrent module: ${modules[currentIndex]!.title}`));

        const skillScore = state.skillScores[currentModuleId] || 0;
        const assessmentPending = state.assessmentPending ?? true;

        console.log(chalk.gray(`Skill score: ${skillScore.toFixed(1)}/10.0`));
        console.log(chalk.gray(`AI approval: ${assessmentPending ? '❌ Pending' : '✅ Granted'}`));

        console.log(chalk.cyan('\n💡 To complete this module:'));
        console.log(chalk.gray('   1. Work on the module objectives'));
        console.log(chalk.gray('   2. Get AI approval: codetandem review <file>'));
        console.log(chalk.gray('   3. Complete module: codetandem complete'));
        console.log(chalk.gray('   4. Then move forward: codetandem next\n'));
        process.exit(1);
      }

      if (currentIndex >= modules.length - 1) {
        console.log(chalk.green("\n🎉 Congratulations! You've completed all modules!\n"));
        console.log(
          chalk.bold('Total Progress:'),
          `${state.completedModules.length}/${modules.length} modules`
        );
        console.log();
        console.log(chalk.cyan("What's next?"));
        console.log(chalk.gray('   • Review completed modules'));
        console.log(chalk.gray('   • Create a new learning project'));
        console.log(chalk.gray('   • Share your achievement!'));
        console.log();
        return;
      }

      const nextModule = modules[currentIndex + 1];

      // Update state to next module
      await updateState('./codetandem.state.json', {
        currentModuleId: nextModule!.id,
        assessmentPending: true, // Reset approval for new module
      });

      console.log(chalk.green('\n✅ Moved to next module!\n'));
      console.log(chalk.bold('Now Learning:'), nextModule!.title);
      console.log(chalk.bold('Objectives:'));
      nextModule!.objectives.forEach((obj, i) => {
        console.log(chalk.cyan(`   ${i + 1}. ${obj}`));
      });
      console.log();
      console.log(chalk.gray('Ready to start? Run: codetandem start'));
      console.log();
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

export const testCommand = new Command('test')
  .description('Run tests for the current task')
  .action(() => {
    console.log(chalk.yellow('Command not yet implemented'));
    console.log('This will run tests against your solution');
  });

export const hintCommand = new Command('hint')
  .description('Get a hint for the current task or objective')
  .argument('[file]', 'File to get hint for (optional)')
  .option('--objective <index>', 'Get hint for specific objective')
  .action(async (file: string | undefined, options) => {
    try {
      const state = await loadState('./codetandem.state.json');
      const modules = await loadModules('./modules.json');
      const currentModule = modules.find((m) => m.id === state.currentModuleId);

      if (!currentModule) {
        console.error(chalk.red('❌ Error: Current module not found'));
        process.exit(1);
      }

      // Track hint usage
      await updateState('./codetandem.state.json', {
        incrementHints: true,
      });

      const progress = state.moduleProgress?.[state.currentModuleId];
      const hintsUsed = (progress?.hintsUsed || 0) + 1;

      console.log(chalk.cyan('\n💡 Hint System\n'));
      console.log(chalk.bold('Module:'), currentModule.title);
      console.log(
        chalk.yellow(`⚠️  Hints used: ${hintsUsed} (each hint reduces final score by 0.5)`)
      );
      console.log();

      // Determine which objective to hint for
      const objectiveIndex = options.objective ? parseInt(options.objective) - 1 : 0;
      const objective = currentModule.objectives[objectiveIndex];

      if (!objective) {
        console.error(chalk.red(`❌ Error: Objective ${options.objective} not found`));
        process.exit(1);
      }

      console.log(chalk.bold('Objective:'), objective);
      console.log();
      console.log(chalk.cyan('💭 Hint:'));
      console.log(chalk.gray('────────────────────────────────────────'));

      // Provide contextual hint based on objective
      console.log(getHintForObjective(objective, currentModule.title, hintsUsed));

      console.log(chalk.gray('────────────────────────────────────────'));
      console.log();
      console.log(chalk.yellow('💡 Remember: Using hints affects your proficiency score!'));
      console.log(chalk.gray('   Try to solve as much as you can independently.'));
      console.log();
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Helper function to provide hints
function getHintForObjective(objective: string, moduleTitle: string, hintLevel: number): string {
  // This is a basic implementation - in a full version, this would use AI
  const hints = [
    `Think about the key concepts in "${objective}". What's the first step?`,
    `Break down "${objective}" into smaller parts. What do you need to accomplish first?`,
    `Consider the module topic: "${moduleTitle}". How does this objective relate?`,
    `Review the module documentation and examples related to: ${objective}`,
  ];

  const hintIndex = Math.min(hintLevel - 1, hints.length - 1);
  return (
    hints[hintIndex] ||
    hints[hints.length - 1] ||
    'Review the objective and try breaking it into smaller steps.'
  );
}

export const solveCommand = new Command('solve')
  .description('Get AI-generated solution (significant score penalty)')
  .argument('[file]', 'File to generate solution for')
  .option('--objective <index>', 'Generate solution for specific objective')
  .option('--confirm', 'Confirm you want to use AI solution')
  .action(async (file: string | undefined, options) => {
    try {
      const state = await loadState('./codetandem.state.json');
      const modules = await loadModules('./modules.json');
      const currentModule = modules.find((m) => m.id === state.currentModuleId);

      if (!currentModule) {
        console.error(chalk.red('❌ Error: Current module not found'));
        process.exit(1);
      }

      // Require confirmation
      if (!options.confirm) {
        console.log(
          chalk.red('\n⚠️  WARNING: Using AI solutions significantly reduces your score!\n')
        );
        console.log(chalk.yellow('Each AI solution reduces your final score by 1.5 points.'));
        console.log(chalk.yellow('This should only be used when you are completely stuck.'));
        console.log();
        console.log(chalk.cyan('If you understand the risk, run:'));
        console.log(chalk.gray(`  codetandem solve ${file || ''} --confirm`));
        console.log();
        console.log(chalk.cyan('💡 Better alternatives:'));
        console.log(chalk.gray('  1. Use: codetandem hint (smaller penalty)'));
        console.log(chalk.gray('  2. Review module documentation'));
        console.log(chalk.gray('  3. Break the problem into smaller parts'));
        console.log();
        process.exit(0);
      }

      // Track solution usage
      await updateState('./codetandem.state.json', {
        incrementSolutions: true,
      });

      const progress = state.moduleProgress?.[state.currentModuleId];
      const solutionsUsed = (progress?.solutionsUsed || 0) + 1;

      console.log(chalk.red('\n⚠️  AI Solution Generated\n'));
      console.log(chalk.bold('Module:'), currentModule.title);
      console.log(
        chalk.red(`⚠️  Solutions used: ${solutionsUsed} (each solution reduces final score by 1.5)`)
      );
      console.log();

      // Determine which objective
      const objectiveIndex = options.objective ? parseInt(options.objective) - 1 : 0;
      const objective = currentModule.objectives[objectiveIndex];

      if (!objective) {
        console.error(chalk.red(`❌ Error: Objective ${options.objective} not found`));
        process.exit(1);
      }

      console.log(chalk.bold('Objective:'), objective);
      console.log();
      console.log(chalk.yellow('💻 AI Solution:'));
      console.log(chalk.gray('────────────────────────────────────────'));

      // In a real implementation, this would call AI to generate solution
      console.log(chalk.yellow('\n[AI-Generated Solution]'));
      console.log(chalk.gray('This would contain a complete code solution.'));
      console.log(chalk.gray('In the full version, this uses AI to generate'));
      console.log(chalk.gray('context-aware code based on the objective.'));

      console.log(chalk.gray('\n────────────────────────────────────────'));
      console.log();
      console.log(chalk.red('⚠️  IMPORTANT: Study this solution to understand it!'));
      console.log(chalk.yellow('   Simply copying reduces your learning and score.'));
      console.log(chalk.gray('   Try to understand WHY this solution works.'));
      console.log();
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
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
