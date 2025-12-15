/**
 * Curriculum Management MCP Tools
 *
 * Tools for AI agents to manage curriculum, modules, and project setup.
 */

import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { loadModules } from '../../utils/modules.js';
import { loadState } from '../../utils/state.js';

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

const DEFAULT_LRD = `# Learning Goal

Describe what you want to learn and build.

## My Background
- Current skill level (beginner/intermediate/advanced)
- What programming languages/technologies I already know
- How I learn best (projects, tutorials, exercises, etc.)

## What I Want to Learn
- Primary goal or technology
- Specific skills or concepts
- What you want to build with this knowledge

## Learning Preferences
- Preferred coding bias (more guidance vs more independence)
- Task difficulty preference (gentle learning curve vs challenging)
- Time commitment (hours per week)

## Project Requirements (Optional)
- If you want to build something specific while learning
- Features or functionality you want to implement
- Technologies or tools you want to use
`;

const DEFAULT_SETTINGS = {
  codingBias: 'balanced',
  taskDifficulty: 'progressive',
  autoReview: true,
  autoProgress: true,
  detailedFeedback: true,
};

/**
 * Initialize CodeTandem project
 */
const initProjectTool: ToolDefinition = {
  name: 'codetandem_init',
  description: 'Initialize a CodeTandem learning project. Creates .codetandem directory, LRD template, and settings. This is step 1 for new learners.',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to initialize project (default: current directory)',
      },
      force: {
        type: 'boolean',
        description: 'Overwrite existing files if they exist',
      },
    },
  },
  handler: async (args) => {
    try {
      const projectPath = (args.projectPath as string) || '.';
      const force = args.force as boolean;

      // Create .codetandem directory
      const codetandemDir = join(projectPath, '.codetandem');
      await mkdir(codetandemDir, { recursive: true });

      // Create docs directory
      const docsDir = join(codetandemDir, 'docs');
      await mkdir(docsDir, { recursive: true });

      // Create LRD file
      const lrdPath = join(projectPath, 'lrd.md');
      try {
        if (force) {
          await writeFile(lrdPath, DEFAULT_LRD, 'utf-8');
        } else {
          await writeFile(lrdPath, DEFAULT_LRD, { flag: 'wx', encoding: 'utf-8' });
        }
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
      }

      // Create settings file
      const settingsPath = join(codetandemDir, 'settings.json');
      await writeFile(settingsPath, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');

      const result = {
        success: true,
        message: 'CodeTandem project initialized',
        files: {
          lrd: lrdPath,
          settings: settingsPath,
          docsDir,
        },
        nextSteps: [
          '1. Edit lrd.md with your learning goals',
          '2. Run codetandem_generate_curriculum to create curriculum',
          '3. Use codetandem_get_current_module to start learning',
        ],
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: message }, null, 2),
        }],
        isError: true,
      };
    }
  },
};

/**
 * List all modules
 */
const listModulesTool: ToolDefinition = {
  name: 'codetandem_list_modules',
  description: 'List all curriculum modules with completion status and proficiency scores. Use this to see the full learning path.',
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
      const statePath = `${projectPath}/codetandem.state.json`;
      const modulesPath = `${projectPath}/modules.json`;

      const state = await loadState(statePath);
      const modules = await loadModules(modulesPath);

      const moduleList = modules.map((module, index) => {
        const isCompleted = state.completedModules.includes(module.id);
        const isCurrent = module.id === state.currentModuleId;
        const score = state.skillScores[module.id] || 0;

        return {
          index: index + 1,
          id: module.id,
          title: module.title,
          objectivesCount: module.objectives.length,
          status: isCompleted ? 'completed' : isCurrent ? 'current' : 'pending',
          proficiencyScore: score,
          isCurrent,
        };
      });

      const result = {
        totalModules: modules.length,
        completedCount: state.completedModules.length,
        currentModule: state.currentModuleId,
        modules: moduleList,
        progress: {
          percentage: (state.completedModules.length / modules.length) * 100,
          completedModules: state.completedModules.length,
          totalModules: modules.length,
        },
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: message }, null, 2),
        }],
        isError: true,
      };
    }
  },
};

/**
 * Update learning settings
 */
const updateSettingsTool: ToolDefinition = {
  name: 'codetandem_update_settings',
  description: 'Update learning preferences like coding bias and difficulty level. Use this to customize the learning experience.',
  inputSchema: {
    type: 'object',
    properties: {
      codingBias: {
        type: 'string',
        enum: ['guided', 'balanced', 'independent'],
        description: 'How much AI guidance vs self-discovery',
      },
      taskDifficulty: {
        type: 'string',
        enum: ['gentle', 'progressive', 'challenging'],
        description: 'Learning curve steepness',
      },
      autoReview: {
        type: 'boolean',
        description: 'Automatically review code after completion',
      },
      autoProgress: {
        type: 'boolean',
        description: 'Automatically track progress from review',
      },
      detailedFeedback: {
        type: 'boolean',
        description: 'Provide detailed explanations',
      },
      projectPath: {
        type: 'string',
        description: 'Path to CodeTandem project (default: current directory)',
      },
    },
  },
  handler: async (args) => {
    try {
      const projectPath = (args.projectPath as string) || '.';
      const settingsPath = join(projectPath, '.codetandem', 'settings.json');

      // Read current settings
      let settings;
      try {
        const content = await readFile(settingsPath, 'utf-8');
        settings = JSON.parse(content);
      } catch {
        settings = { ...DEFAULT_SETTINGS };
      }

      // Update settings
      if (args.codingBias) settings.codingBias = args.codingBias;
      if (args.taskDifficulty) settings.taskDifficulty = args.taskDifficulty;
      if (args.autoReview !== undefined) settings.autoReview = args.autoReview;
      if (args.autoProgress !== undefined) settings.autoProgress = args.autoProgress;
      if (args.detailedFeedback !== undefined) settings.detailedFeedback = args.detailedFeedback;

      // Write updated settings
      await writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');

      const result = {
        success: true,
        message: 'Settings updated successfully',
        settings,
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: message }, null, 2),
        }],
        isError: true,
      };
    }
  },
};

/**
 * Export all curriculum tools
 */
export const curriculumTools: Record<string, ToolDefinition> = {
  codetandem_init: initProjectTool,
  codetandem_list_modules: listModulesTool,
  codetandem_update_settings: updateSettingsTool,
};
