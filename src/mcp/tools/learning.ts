/**
 * Learning Management MCP Tools
 *
 * Tools for AI agents to manage learning progression, code review, and objective completion.
 */

import { readFile } from 'fs/promises';
import {
  loadState,
  updateState,
  getModuleProgress,
  areAllObjectivesCompleted,
} from '../../utils/state.js';
import { loadModules } from '../../utils/modules.js';
import { extractTodoCode } from '../../utils/code-parser.js';
import { reviewCodeWithAI } from '../../utils/review.js';
import { getAIProvider } from '../../providers/factory.js';
import { ConfigManager } from '../../utils/config.js';
import { getApiKey } from '../../utils/secrets.js';
import type { ModuleProgress } from '../../types/state.js';
import { getStatePath, getModulesPath } from '../../utils/paths.js';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}

/**
 * Get current learning module and objectives
 */
const getCurrentModuleTool: ToolDefinition = {
  name: 'codetandem_get_current_module',
  description:
    'Get the current learning module with objectives, progress, and proficiency scores. Use this to understand where the user is in their learning journey.',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to CodeTandem project (default: current directory)',
      },
    },
  },
  handler: async (args) => {
    try {
      const projectPath = (args.projectPath as string) || '.';
      const statePath = getStatePath(projectPath);
      const modulesPath = getModulesPath(projectPath);

      const state = await loadState(statePath);
      const modules = await loadModules(modulesPath);

      const currentModule = modules.find((m) => m.id === state.currentModuleId);
      if (!currentModule) {
        throw new Error('Current module not found');
      }

      const progress = getModuleProgress(state, state.currentModuleId);
      const skillScore = state.skillScores[state.currentModuleId] || 0;

      const objectives = currentModule.objectives.map((obj, i) => {
        const objId = `obj-${i + 1}`;
        const completed = progress.objectivesCompleted.some((c) => c.objectiveId === objId);
        return {
          id: objId,
          text: obj,
          completed,
        };
      });

      const result = {
        moduleId: state.currentModuleId,
        title: currentModule.title,
        description: currentModule.description || '',
        objectives,
        progress: {
          objectivesComplete: progress.objectivesCompleted.length,
          objectivesTotal: currentModule.objectives.length,
          proficiencyScore: skillScore,
          hintsUsed: progress.hintsUsed,
          solutionsUsed: progress.solutionsUsed,
          attempts: progress.attempts,
        },
        canProgress:
          areAllObjectivesCompleted(
            state,
            state.currentModuleId,
            currentModule.objectives.length
          ) && skillScore >= 7.0,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Submit code for AI review
 */
const reviewCodeTool: ToolDefinition = {
  name: 'codetandem_review_code',
  description:
    'Submit code for AI review and proficiency scoring. Returns feedback, score (with penalties), and whether objectives are complete. This is the PRIMARY way AI should evaluate user code.',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Path to the file to review',
      },
      todoId: {
        type: 'string',
        description: 'Optional TODO ID (e.g., "obj-1") to link to specific objective',
      },
      projectPath: {
        type: 'string',
        description: 'Path to CodeTandem project (default: current directory)',
      },
    },
    required: ['filePath'],
  },
  handler: async (args) => {
    try {
      const filePath = args.filePath as string;
      const todoId = args.todoId as string | undefined;
      const projectPath = (args.projectPath as string) || '.';
      const statePath = getStatePath(projectPath);
      const modulesPath = getModulesPath(projectPath);

      const state = await loadState(statePath);
      const modules = await loadModules(modulesPath);
      const currentModule = modules.find((m) => m.id === state.currentModuleId);

      if (!currentModule) {
        throw new Error('Current module not found');
      }

      // Extract code
      let codeExtraction;
      if (todoId) {
        codeExtraction = await extractTodoCode(filePath, todoId);
      } else {
        const fileContent = await readFile(filePath, 'utf-8');
        codeExtraction = {
          filePath,
          todoLine: 0,
          todoText: 'Full file review',
          code: fileContent,
          startLine: 1,
          endLine: fileContent.split('\n').length,
        };
      }

      if (!codeExtraction) {
        throw new Error(
          `Could not extract code from ${filePath}${todoId ? ` for TODO: ${todoId}` : ''}`
        );
      }

      // Get AI provider
      const config = new ConfigManager();
      const provider = await config.getProvider();
      const model = await config.getModel();
      const apiKey = await getApiKey(provider);

      if (!apiKey) {
        throw new Error('No API key configured. Run: codetandem config set-key');
      }

      const aiProvider = getAIProvider({
        providerName: provider as 'openai' | 'anthropic' | 'google',
        model,
        apiKey,
      });

      // Get review
      const review = await reviewCodeWithAI(
        aiProvider,
        codeExtraction,
        currentModule.title,
        currentModule.objectives[0] || '',
        0.3
      );

      // Calculate proficiency with penalties
      const progress = getModuleProgress(state, state.currentModuleId);
      const hintPenalty = progress.hintsUsed * 0.5;
      const solutionPenalty = progress.solutionsUsed * 1.5;
      const totalPenalty = Math.min(hintPenalty + solutionPenalty, 3.0);
      const adjustedScore = Math.max(0, (review.score || 0) - totalPenalty);

      // Record objective completion if TODO ID present
      if (codeExtraction.todoId && review.success && adjustedScore >= 7.0) {
        await updateState(statePath, {
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

      // Update skill score
      await updateState(statePath, {
        skillScore: adjustedScore,
      });

      // Reload state to get updated progress
      const updatedState = await loadState(statePath);
      const updatedProgress = getModuleProgress(updatedState, state.currentModuleId);
      const allComplete = areAllObjectivesCompleted(
        updatedState,
        state.currentModuleId,
        currentModule.objectives.length
      );

      // Check if module can be completed
      let moduleComplete = false;
      let nextModule = null;

      if (allComplete && adjustedScore >= 7.0 && review.success) {
        const isAlreadyCompleted = updatedState.completedModules.includes(state.currentModuleId);

        if (!isAlreadyCompleted) {
          // Mark module as complete
          await updateState(statePath, {
            completedModuleId: state.currentModuleId,
          });

          // Check for next module
          const currentIndex = modules.findIndex((m) => m.id === state.currentModuleId);
          const hasNextModule = currentIndex < modules.length - 1;

          if (hasNextModule) {
            const nextMod = modules[currentIndex + 1];
            await updateState(statePath, {
              currentModuleId: nextMod!.id,
              assessmentPending: true,
            });

            nextModule = {
              id: nextMod!.id,
              title: nextMod!.title,
              objectives: nextMod!.objectives,
            };
          }

          moduleComplete = true;
        }
      }

      const result = {
        success: review.success,
        rawScore: review.score || 0,
        penalty: {
          total: totalPenalty,
          hints: hintPenalty,
          solutions: solutionPenalty,
        },
        adjustedScore,
        feedback: review.feedback,
        suggestions: review.suggestions || [],
        objectiveCompleted: codeExtraction.todoId || null,
        progress: {
          objectivesComplete: updatedProgress.objectivesCompleted.length,
          objectivesTotal: currentModule.objectives.length,
          remainingObjectives:
            currentModule.objectives.length - updatedProgress.objectivesCompleted.length,
        },
        moduleComplete,
        nextModule,
        canProgress: allComplete && adjustedScore >= 7.0,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get hint for objective
 */
const getHintTool: ToolDefinition = {
  name: 'codetandem_get_hint',
  description:
    'Get AI-generated hint for current objective. WARNING: Applies -0.5 penalty to proficiency score. Only use when user is stuck.',
  inputSchema: {
    type: 'object',
    properties: {
      objectiveIndex: {
        type: 'number',
        description: 'Objective number (1-based index)',
      },
      projectPath: {
        type: 'string',
        description: 'Path to CodeTandem project (default: current directory)',
      },
    },
    required: ['objectiveIndex'],
  },
  handler: async (args) => {
    try {
      const objectiveIndex = args.objectiveIndex as number;
      const projectPath = (args.projectPath as string) || '.';
      const statePath = getStatePath(projectPath);
      const modulesPath = getModulesPath(projectPath);

      const state = await loadState(statePath);
      const modules = await loadModules(modulesPath);
      const currentModule = modules.find((m) => m.id === state.currentModuleId);

      if (!currentModule) {
        throw new Error('Current module not found');
      }

      const objective = currentModule.objectives[objectiveIndex - 1];
      if (!objective) {
        throw new Error(`Objective ${objectiveIndex} not found`);
      }

      // Track hint usage
      await updateState(statePath, {
        incrementHints: true,
      });

      const updatedState = await loadState(statePath);
      const progress = getModuleProgress(updatedState, state.currentModuleId);

      // Generate hint (basic implementation - could use AI in future)
      const hints = [
        `Think about the key concepts in "${objective}". What's the first step?`,
        `Break down "${objective}" into smaller parts. What do you need to accomplish first?`,
        `Consider the module topic: "${currentModule.title}". How does this objective relate?`,
        `Review examples and documentation for: ${objective}`,
      ];

      const hintLevel = Math.min(progress.hintsUsed - 1, hints.length - 1);
      const hint =
        hints[hintLevel] ||
        hints[hints.length - 1] ||
        'Review the objective and try breaking it into smaller steps.';

      const result = {
        objective,
        hint,
        penaltyApplied: 0.5,
        totalHints: progress.hintsUsed,
        totalSolutions: progress.solutionsUsed,
        currentPenalty: progress.hintsUsed * 0.5 + progress.solutionsUsed * 1.5,
        warning: 'Hint usage reduces your proficiency score by 0.5 points',
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Get AI solution (with confirmation)
 */
const getSolutionTool: ToolDefinition = {
  name: 'codetandem_get_solution',
  description:
    'Get AI-generated complete solution. WARNING: Applies -1.5 penalty to proficiency score. Requires confirmation=true. Only use as last resort.',
  inputSchema: {
    type: 'object',
    properties: {
      objectiveIndex: {
        type: 'number',
        description: 'Objective number (1-based index)',
      },
      confirm: {
        type: 'boolean',
        description: 'Must be true to confirm understanding of -1.5 penalty',
      },
      projectPath: {
        type: 'string',
        description: 'Path to CodeTandem project (default: current directory)',
      },
    },
    required: ['objectiveIndex', 'confirm'],
  },
  handler: async (args) => {
    try {
      const objectiveIndex = args.objectiveIndex as number;
      const confirm = args.confirm as boolean;
      const projectPath = (args.projectPath as string) || '.';

      if (!confirm) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Confirmation required',
                  message: 'Solution request applies -1.5 penalty. Set confirm=true to proceed.',
                  alternatives: [
                    'Use codetandem_get_hint (only -0.5 penalty)',
                    'Ask AI to explain the concept',
                    'Review module documentation',
                  ],
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const statePath = `${projectPath}/codetandem.state.json`;
      const modulesPath = `${projectPath}/modules.json`;

      const state = await loadState(statePath);
      const modules = await loadModules(modulesPath);
      const currentModule = modules.find((m) => m.id === state.currentModuleId);

      if (!currentModule) {
        throw new Error('Current module not found');
      }

      const objective = currentModule.objectives[objectiveIndex - 1];
      if (!objective) {
        throw new Error(`Objective ${objectiveIndex} not found`);
      }

      // Track solution usage
      await updateState(statePath, {
        incrementSolutions: true,
      });

      const updatedState = await loadState(statePath);
      const progress = getModuleProgress(updatedState, state.currentModuleId);

      const result = {
        objective,
        solution: {
          note: 'In production, this would contain AI-generated code solution',
          placeholder: '# Complete solution code would be generated here',
          advice: 'Study this solution to understand WHY it works, not just copy it',
        },
        penaltyApplied: 1.5,
        totalHints: progress.hintsUsed,
        totalSolutions: progress.solutionsUsed,
        currentPenalty: progress.hintsUsed * 0.5 + progress.solutionsUsed * 1.5,
        warning: 'Solution usage significantly reduces learning and proficiency score',
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * Export all learning tools
 */
export const learningTools: Record<string, ToolDefinition> = {
  codetandem_get_current_module: getCurrentModuleTool,
  codetandem_review_code: reviewCodeTool,
  codetandem_get_hint: getHintTool,
  codetandem_get_solution: getSolutionTool,
};
