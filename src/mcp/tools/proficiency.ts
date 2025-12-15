import { z } from 'zod';
import { loadState, getModuleProgress, calculateProficiencyPenalty } from '../../utils/state.js';
import { loadModules } from '../../utils/modules.js';

/**
 * MCP Tool Definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  handler: (args: any) => Promise<any>;
}

/**
 * Get proficiency report for current or specific module
 */
const getProficiencyReportTool: ToolDefinition = {
  name: 'codetandem_get_proficiency_report',
  description:
    'Get detailed proficiency report showing objectives completed, penalties, and scores for current or specific module.',
  inputSchema: z.object({
    moduleId: z
      .string()
      .optional()
      .describe('Optional module ID. If not provided, uses current module.'),
  }),
  handler: async (args) => {
    try {
      const state = await loadState('./codetandem.state.json');
      const moduleId = args.moduleId || state.currentModuleId;

      if (!moduleId) {
        return {
          error: 'No module specified and no current module in progress',
        };
      }

      const modules = await loadModules('./modules.json');
      const module = modules.find((m) => m.id === moduleId);

      if (!module) {
        return {
          error: `Module not found: ${moduleId}`,
        };
      }

      const progress = getModuleProgress(state, moduleId);
      const penalty = calculateProficiencyPenalty(progress.hintsUsed, progress.solutionsUsed);

      const objectiveReports = progress.objectivesCompleted.map((obj) => ({
        objectiveId: obj.objectiveId,
        objectiveText: obj.objectiveText,
        score: obj.score,
        completedAt: obj.completedAt,
        hintsUsedAtCompletion: obj.hintsUsed,
        solutionsUsedAtCompletion: obj.solutionsUsed,
      }));

      const totalObjectives = module.objectives.length;
      const completedObjectives = progress.objectivesCompleted.length;
      const proficiencyPercentage = (completedObjectives / totalObjectives) * 100;

      return {
        moduleId,
        moduleTitle: module.title,
        proficiency: {
          totalObjectives,
          completedObjectives,
          percentage: Math.round(proficiencyPercentage * 10) / 10,
        },
        penalties: {
          totalHintsUsed: progress.hintsUsed,
          totalSolutionsUsed: progress.solutionsUsed,
          totalPenalty: penalty,
          breakdown: {
            hintPenalty: progress.hintsUsed * 0.5,
            solutionPenalty: progress.solutionsUsed * 1.5,
          },
        },
        bestScore: progress.bestScore,
        attempts: progress.attempts,
        objectives: objectiveReports,
        canProgress: completedObjectives >= totalObjectives && progress.bestScore >= 7.0,
      };
    } catch (error: any) {
      return {
        error: error.message,
      };
    }
  },
};

/**
 * Get overall progress across all modules
 */
const getOverallProgressTool: ToolDefinition = {
  name: 'codetandem_get_overall_progress',
  description:
    'Get overall learning progress across all curriculum modules, including completion rates and average proficiency.',
  inputSchema: z.object({}),
  handler: async () => {
    try {
      const state = await loadState('./codetandem.state.json');
      const modules = await loadModules('./modules.json');

      const moduleReports = modules.map((module) => {
        const isCompleted = state.completedModules?.includes(module.id) || false;
        const isCurrent = state.currentModuleId === module.id;
        const progress = getModuleProgress(state, module.id);
        const penalty = calculateProficiencyPenalty(progress.hintsUsed, progress.solutionsUsed);

        const totalObjectives = module.objectives.length;
        const completedObjectives = progress.objectivesCompleted.length;
        const proficiencyPercentage =
          totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0;

        return {
          moduleId: module.id,
          title: module.title,
          status: isCompleted ? 'completed' : isCurrent ? 'in_progress' : 'not_started',
          proficiency: {
            percentage: Math.round(proficiencyPercentage * 10) / 10,
            completedObjectives,
            totalObjectives,
          },
          bestScore: progress.bestScore,
          attempts: progress.attempts,
          penalty,
          hintsUsed: progress.hintsUsed,
          solutionsUsed: progress.solutionsUsed,
        };
      });

      const completedModules = moduleReports.filter((m) => m.status === 'completed').length;
      const totalModules = modules.length;
      const overallProgress = (completedModules / totalModules) * 100;

      const averageProficiency =
        moduleReports.reduce((sum, m) => sum + m.proficiency.percentage, 0) / totalModules;

      const totalHints = moduleReports.reduce((sum, m) => sum + m.hintsUsed, 0);
      const totalSolutions = moduleReports.reduce((sum, m) => sum + m.solutionsUsed, 0);
      const totalPenalty = calculateProficiencyPenalty(totalHints, totalSolutions);

      return {
        overview: {
          totalModules,
          completedModules,
          currentModule: state.currentModuleId,
          progressPercentage: Math.round(overallProgress * 10) / 10,
          averageProficiency: Math.round(averageProficiency * 10) / 10,
        },
        penalties: {
          totalHintsUsed: totalHints,
          totalSolutionsUsed: totalSolutions,
          totalPenalty,
        },
        modules: moduleReports,
      };
    } catch (error: any) {
      return {
        error: error.message,
      };
    }
  },
};

/**
 * Get remaining objectives for current module
 */
const getRemainingObjectivesTool: ToolDefinition = {
  name: 'codetandem_get_remaining_objectives',
  description: 'Get list of objectives that still need to be completed in the current module.',
  inputSchema: z.object({}),
  handler: async () => {
    try {
      const state = await loadState('./codetandem.state.json');
      const moduleId = state.currentModuleId;

      if (!moduleId) {
        return {
          error: 'No current module in progress',
        };
      }

      const modules = await loadModules('./modules.json');
      const module = modules.find((m) => m.id === moduleId);

      if (!module) {
        return {
          error: `Module not found: ${moduleId}`,
        };
      }

      const progress = getModuleProgress(state, moduleId);
      const completedObjectiveIds = new Set(
        progress.objectivesCompleted.map((obj) => obj.objectiveId)
      );

      const remainingObjectives = module.objectives
        .map((obj, index) => ({
          objectiveId: `obj-${index + 1}`,
          description: obj,
          todoFormat: `// TODO: [obj-${index + 1}] ${obj}`,
        }))
        .filter((obj) => !completedObjectiveIds.has(obj.objectiveId));

      const completedCount = module.objectives.length - remainingObjectives.length;

      return {
        moduleId,
        moduleTitle: module.title,
        totalObjectives: module.objectives.length,
        completedObjectives: completedCount,
        remainingObjectives,
        allComplete: remainingObjectives.length === 0,
      };
    } catch (error: any) {
      return {
        error: error.message,
      };
    }
  },
};

/**
 * Reset proficiency tracking for a module (for retrying)
 */
const resetModuleProficiencyTool: ToolDefinition = {
  name: 'codetandem_reset_module_proficiency',
  description:
    'Reset proficiency tracking for current or specific module. Use this when user wants to retry a module from scratch.',
  inputSchema: z.object({
    moduleId: z
      .string()
      .optional()
      .describe('Optional module ID. If not provided, uses current module.'),
    confirm: z.boolean().describe('Must be true to confirm reset.'),
  }),
  handler: async (args) => {
    if (!args.confirm) {
      return {
        error: 'Must set confirm=true to reset module proficiency',
        warning:
          'This will delete all objective completions, scores, and penalty tracking for this module.',
      };
    }

    try {
      const state = await loadState('./codetandem.state.json');
      const moduleId = args.moduleId || state.currentModuleId;

      if (!moduleId) {
        return {
          error: 'No module specified and no current module in progress',
        };
      }

      // Reset module progress
      if (!state.moduleProgress) {
        state.moduleProgress = {};
      }

      state.moduleProgress[moduleId] = {
        attempts: 0,
        objectivesCompleted: [],
        hintsUsed: 0,
        solutionsUsed: 0,
        bestScore: 0,
      };

      // Save state
      const fs = await import('fs/promises');
      await fs.writeFile('./codetandem.state.json', JSON.stringify(state, null, 2));

      return {
        success: true,
        message: `Proficiency tracking reset for module: ${moduleId}`,
        moduleId,
      };
    } catch (error: any) {
      return {
        error: error.message,
      };
    }
  },
};

/**
 * Export all proficiency tools
 */
export const proficiencyTools = {
  codetandem_get_proficiency_report: getProficiencyReportTool,
  codetandem_get_overall_progress: getOverallProgressTool,
  codetandem_get_remaining_objectives: getRemainingObjectivesTool,
  codetandem_reset_module_proficiency: resetModuleProficiencyTool,
};
