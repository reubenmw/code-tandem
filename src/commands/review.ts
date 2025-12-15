/**
 * Review command - AI code review with automatic progress tracking
 */

import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import { getAIProvider } from '../providers/factory.js';
import { ConfigManager } from '../utils/config.js';
import {
  loadState,
  updateState,
  getCurrentModuleId,
  getSkillScore,
  getModuleProgress,
  areAllObjectivesCompleted,
  calculateProficiencyPenalty,
} from '../utils/state.js';
import { loadModules, getModuleById } from '../utils/modules.js';
import { extractTodoCode } from '../utils/code-parser.js';
import { reviewCodeWithAI } from '../utils/review.js';

interface Settings {
  codingBias: 'guided' | 'balanced' | 'independent';
  taskDifficulty: 'gentle' | 'progressive' | 'challenging';
  autoReview: boolean;
  autoProgress: boolean;
  detailedFeedback: boolean;
}

export const reviewCommand = new Command('review')
  .description('Review code with AI and track progress automatically')
  .argument('<file>', 'File to review')
  .option('--todo <text>', 'Review specific TODO')
  .option('--no-auto-progress', 'Disable automatic progress tracking')
  .action(async (file: string, options) => {
    try {
      // Load state and modules
      const state = await loadState('./codetandem.state.json');
      const modules = await loadModules('./modules.json');
      const currentModule = getModuleById(modules, getCurrentModuleId(state));
      const currentSkillScore = getSkillScore(state, state.currentModuleId);

      // Load settings
      const settingsPath = join('.codetandem', 'settings.json');
      let settings: Settings;
      try {
        const settingsContent = await readFile(settingsPath, 'utf-8');
        settings = JSON.parse(settingsContent);
      } catch {
        settings = {
          codingBias: 'balanced',
          taskDifficulty: 'progressive',
          autoReview: true,
          autoProgress: true,
          detailedFeedback: true,
        };
      }

      // Get AI provider
      const config = new ConfigManager();
      const provider = await config.getProvider();
      const model = await config.getModel();
      const apiKey = await config.getApiKey(provider);

      if (!apiKey) {
        console.error(chalk.red('❌ Error: No API key configured'));
        process.exit(1);
      }

      const aiProvider = getAIProvider({
        providerName: provider as any,
        model,
        apiKey,
      });

      console.log(chalk.cyan('\n🔍 Code Review Session\n'));
      console.log(chalk.bold('File:'), file);
      console.log(chalk.bold('Module:'), currentModule.title);
      console.log(chalk.bold('Current Skill:'), `${currentSkillScore.toFixed(1)}/10.0`);
      console.log();

      // Extract code to review
      let codeExtraction;
      if (options.todo) {
        codeExtraction = await extractTodoCode(file, options.todo);
        if (!codeExtraction) {
          console.error(chalk.red(`❌ Error: TODO "${options.todo}" not found in ${file}`));
          process.exit(1);
        }
      } else {
        // Review entire file
        const fileContent = await readFile(file, 'utf-8');
        codeExtraction = {
          filePath: file,
          todoLine: 0,
          todoText: 'Full file review',
          code: fileContent,
          startLine: 1,
          endLine: fileContent.split('\n').length,
        };
      }

      console.log(chalk.cyan('🤖 Analyzing your code...\n'));

      // Get review from AI
      const moduleContext = currentModule.title;
      const objective = currentModule.objectives[0]; // Use first objective for context

      const review = await reviewCodeWithAI(
        aiProvider,
        codeExtraction,
        moduleContext,
        objective,
        0.3 // Lower temperature for consistent reviews
      );

      // Display review results
      console.log(chalk.gray('─'.repeat(70)));
      console.log();

      if (review.success) {
        console.log(chalk.green('✅ Great work! Your code looks good.\n'));
      } else {
        console.log(chalk.yellow('⚠️  Your code needs some improvements.\n'));
      }

      console.log(chalk.bold('Feedback:'));
      console.log(review.feedback);
      console.log();

      if (review.suggestions && review.suggestions.length > 0) {
        console.log(chalk.bold('💡 Suggestions:'));
        review.suggestions.forEach((suggestion, i) => {
          console.log(chalk.cyan(`   ${i + 1}. ${suggestion}`));
        });
        console.log();
      }

      if (review.score !== undefined) {
        console.log(chalk.bold('Score:'), `${review.score.toFixed(1)}/10.0`);

        // Show score change
        const scoreDiff = review.score - currentSkillScore;
        if (scoreDiff > 0) {
          console.log(chalk.green(`   ↑ +${scoreDiff.toFixed(1)} improvement!`));
        } else if (scoreDiff < 0) {
          console.log(chalk.yellow(`   ↓ ${scoreDiff.toFixed(1)}`));
        } else {
          console.log(chalk.gray('   → No change'));
        }
        console.log();
      }

      console.log(chalk.gray('─'.repeat(70)));
      console.log();

      // Auto progress tracking
      const shouldAutoProgress = options.autoProgress !== false && settings.autoProgress;

      if (shouldAutoProgress && review.score !== undefined) {
        console.log(chalk.cyan('📊 Updating progress...\n'));

        // Get current module progress
        const progress = getModuleProgress(state, state.currentModuleId);
        const penalty = calculateProficiencyPenalty(progress.hintsUsed, progress.solutionsUsed);

        // Apply penalty to score
        const adjustedScore = Math.max(0, review.score - penalty);

        // Record objective completion if TODO ID present
        if (codeExtraction.todoId) {
          await updateState('./codetandem.state.json', {
            objectiveCompletion: {
              objectiveId: codeExtraction.todoId,
              objectiveText: codeExtraction.todoText,
              todoId: codeExtraction.todoId,
              completedAt: new Date().toISOString(),
              score: adjustedScore,
              hintsUsed: progress.hintsUsed,
              solutionsUsed: progress.solutionsUsed,
            },
          });
        }

        // Update skill score with adjusted value
        await updateState('./codetandem.state.json', {
          skillScore: adjustedScore,
        });

        if (penalty > 0) {
          console.log(
            chalk.yellow(`⚠️  Proficiency penalty applied: -${penalty.toFixed(1)} points`)
          );
          console.log(
            chalk.gray(
              `   Hints used: ${progress.hintsUsed} (-${(progress.hintsUsed * 0.5).toFixed(1)})`
            )
          );
          console.log(
            chalk.gray(
              `   Solutions used: ${progress.solutionsUsed} (-${(progress.solutionsUsed * 1.5).toFixed(1)})`
            )
          );
        }

        console.log(
          chalk.green(
            `✓ Skill score: ${currentSkillScore.toFixed(1)} → ${adjustedScore.toFixed(1)}${penalty > 0 ? ` (raw: ${review.score.toFixed(1)})` : ''}`
          )
        );

        // Check if module can be completed (AI approval required)
        const canProgressScore = adjustedScore >= 7.0 && review.success;
        const totalObjectives = currentModule.objectives.length;
        const allObjectivesComplete = areAllObjectivesCompleted(
          state,
          state.currentModuleId,
          totalObjectives
        );

        if (canProgressScore && allObjectivesComplete) {
          // AI APPROVAL GRANTED - Auto-complete and advance
          const currentModuleId = state.currentModuleId;
          const isAlreadyCompleted = state.completedModules.includes(currentModuleId);

          if (!isAlreadyCompleted) {
            // Mark module as complete
            await updateState('./codetandem.state.json', {
              completedModuleId: currentModuleId,
            });

            console.log(chalk.green.bold('\n🎉 MODULE COMPLETED!'));
            console.log(chalk.green(`✓ ${currentModule.title}`));
            console.log(chalk.green(`✓ Final Score: ${review.score.toFixed(1)}/10.0`));

            // Check if there are more modules
            const currentIndex = modules.findIndex((m) => m.id === currentModuleId);
            const hasNextModule = currentIndex < modules.length - 1;

            if (hasNextModule) {
              const nextModule = modules[currentIndex + 1];

              // Automatically advance to next module
              await updateState('./codetandem.state.json', {
                currentModuleId: nextModule!.id,
                assessmentPending: true,
              });

              console.log(chalk.cyan('\n📚 Moving to next module...\n'));
              console.log(chalk.bold('Now Learning:'), nextModule!.title);
              console.log(chalk.bold('Objectives:'));
              nextModule!.objectives.forEach((obj, i) => {
                console.log(chalk.cyan(`   ${i + 1}. ${obj}`));
              });
              console.log();
              console.log(
                chalk.gray(
                  `Progress: ${state.completedModules.length + 1}/${modules.length} modules`
                )
              );
              console.log(chalk.gray('\n  Run: codetandem start (to begin)'));
            } else {
              // Completed all modules!
              console.log(
                chalk.green.bold("\n🎉 CONGRATULATIONS! You've completed all modules!\n")
              );
              console.log(
                chalk.bold('Total Progress:'),
                `${state.completedModules.length + 1}/${modules.length} modules`
              );
              console.log();
              console.log(chalk.cyan("What's next?"));
              console.log(chalk.gray('   • Review completed modules'));
              console.log(chalk.gray('   • Create a new learning project'));
              console.log(chalk.gray('   • Share your achievement!'));
            }
          } else {
            console.log(chalk.green.bold('\n✅ Excellent work!'));
            console.log(chalk.green('✓ Your code meets all requirements'));
            console.log(chalk.gray('  (Module already completed)'));
          }
        } else if (canProgressScore && !allObjectivesComplete) {
          // Good score but not all objectives complete
          const updatedProgress = getModuleProgress(state, state.currentModuleId);
          const remaining = totalObjectives - updatedProgress.objectivesCompleted.length;

          console.log(chalk.yellow('\n⚠️  Good progress, but more objectives needed'));
          console.log(chalk.green(`✓ Score meets requirement: ${adjustedScore.toFixed(1)}/10.0`));
          console.log(
            chalk.yellow(
              `⚠️  Objectives: ${updatedProgress.objectivesCompleted.length}/${totalObjectives} complete`
            )
          );
          console.log(
            chalk.gray(
              `   Need to complete ${remaining} more objective${remaining === 1 ? '' : 's'}`
            )
          );
          console.log();
          console.log(chalk.cyan('📋 Remaining objectives:'));
          currentModule.objectives.forEach((obj, i) => {
            const objId = `obj-${i + 1}`;
            const isComplete = updatedProgress.objectivesCompleted.some(
              (completed) => completed.objectiveId === objId
            );
            if (!isComplete) {
              console.log(chalk.gray(`   ${i + 1}. ${obj}`));
            }
          });
        } else if (adjustedScore >= 5.0) {
          console.log(chalk.yellow('\n⚠️  Not quite there yet'));
          console.log(chalk.yellow('✓ Good progress, but AI approval required to proceed'));
          console.log(
            chalk.gray(
              `  Need: Successful review + score ≥ 7.0 (current: ${adjustedScore.toFixed(1)})`
            )
          );
        } else {
          console.log(chalk.yellow('\n⚠️  Keep practicing'));
          console.log(chalk.yellow('✓ Review the feedback above and try again'));
          console.log(
            chalk.gray(
              `  Need: Successful review + score ≥ 7.0 (current: ${adjustedScore.toFixed(1)})`
            )
          );
        }

        console.log();
      }

      // Next steps
      if (!review.success || (review.score && review.score < 7.0)) {
        console.log(chalk.bold('📝 Next Steps:\n'));
        console.log(chalk.gray('1. Review the feedback and suggestions above'));
        console.log(chalk.gray('2. Make improvements to your code'));
        console.log(chalk.gray(`3. Run: codetandem review ${file} (to check again)`));
        console.log();
      }
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });
