/**
 * Project Management MCP Tools
 */

import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import chalk from 'chalk';
import { loadState, getCurrentModuleId, getModuleProgress, updateState } from '../../utils/state.js';
import { loadModules, getModuleById } from '../../utils/modules.js';
import { getStatePath, getModulesPath } from '../../utils/paths.js';
import type { TodoRecord } from '../../types/state.js';
import {
  loadProjectContext,
  buildCodingPrompt,
  generateCodeWithAI,
  applyCodeModification,
} from '../../utils/tandem.js';
import { getAIProvider } from '../../providers/factory.js';
import { ConfigManager } from '../../utils/config.js';
import { getApiKey } from '../../utils/secrets.js';

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

const createProjectFilesTool: ToolDefinition = {
  name: 'codetandem_create_project_files',
  description:
    'DEPRECATED: Use codetandem_create_feature instead. This tool creates basic TODO files but does not follow the product-first philosophy. Use codetandem_create_feature to create real product features.',
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
      const currentModule = getModuleById(modules, getCurrentModuleId(state));

      if (!currentModule) {
        throw new Error('Current module not found');
      }

      const slugify = (text: string) =>
        text
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '');

      try {
        await mkdir(join(projectPath, 'src'), { recursive: true });
      } catch (error) {
        // Ignore if directory already exists
      }

      const createdFiles = [];
      for (const objective of currentModule.objectives) {
        const fileName = `${slugify(objective)}.js`;
        const filePath = join(projectPath, 'src', fileName);
        const fileContent = `// TODO: ${objective}\n`;

        await writeFile(filePath, fileContent, 'utf-8');
        createdFiles.push(filePath);
      }

      return {
        content: [{
          type: 'text',
          text: `Created ${createdFiles.length} files:\n${createdFiles.join('\n')}`,
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
 * Create a feature with curriculum-aligned TODOs
 * This is the PRIMARY tool for AI agents to help users build features
 *
 * CRITICAL PHILOSOPHY - VIBE CODER / USER-LED DEVELOPMENT:
 * - The USER is a "vibe coder" who KNOWS what product they want to build
 * - The USER is steering and directing the AI to build THEIR product
 * - PRIORITY #1: Build the feature the user requested - this is THEIR vision
 * - PRIORITY #2: Learning objectives should naturally fit into their requested features
 * - The user's product vision and feature request trump curriculum alignment
 * - Learning happens organically by building what THEY want, not forced exercises
 * - NO dedicated learning files (e.g., "exercise-1.js", "practice.py")
 * - NO curriculum-based folders (e.g., "module-1/", "lesson-2/", "python-basics/")
 * - USE product architecture folders (e.g., "src/auth/", "lib/", "api/", "services/")
 * - If conflict: USER'S PRODUCT VISION WINS, not the curriculum
 */
const createFeatureTool: ToolDefinition = {
  name: 'codetandem_create_feature',
  description:
    'Build the EXACT feature the user wants for THEIR product. CRITICAL: User is a "vibe coder" driving the product vision - they know what they want to build. Your job is to help build THEIR product, weaving learning naturally into THEIR requested features. User\'s vision comes FIRST, curriculum alignment is secondary. Build what they ask for. AUTOMATIC: This tool stores all generated TODOs with their success criteria in state for tracking and review.',
  inputSchema: {
    type: 'object',
    properties: {
      featureDescription: {
        type: 'string',
        description:
          'Description of the feature to build (e.g., "Build a login system", "Create a todo list component")',
      },
      targetFile: {
        type: 'string',
        description:
          'Optional target file path (relative to project). If not provided, AI will suggest a file name.',
      },
      codingBias: {
        type: 'string',
        enum: ['guided', 'balanced', 'independent'],
        description:
          'How much scaffolding to provide: "guided" (detailed hints), "balanced" (moderate), "independent" (minimal). Defaults to "balanced".',
      },
      projectPath: {
        type: 'string',
        description: 'Path to CodeTandem project (default: current directory)',
      },
    },
    required: ['featureDescription'],
  },
  handler: async (args) => {
    try {
      const featureDescription = args.featureDescription as string;
      const targetFile = args.targetFile as string | undefined;
      const codingBias = (args.codingBias as 'guided' | 'balanced' | 'independent') || 'balanced';
      const projectPath = (args.projectPath as string) || '.';

      // Load project context
      const context = await loadProjectContext(projectPath);

      // Get skill level from state
      const skillLevel = context.state.skillScores[context.currentModule.id] || 0;
      const progress = getModuleProgress(context.state, context.currentModule.id);

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

      // Read existing file content if target file is provided
      let fileContent: string | undefined;
      if (targetFile) {
        try {
          const filePath = resolve(projectPath, targetFile);
          fileContent = await readFile(filePath, 'utf-8');
        } catch (error) {
          // File doesn't exist, that's OK - we'll create it
          fileContent = undefined;
        }
      }

      // Generate code with AI including feature description
      const modification = await generateCodeWithAI(
        aiProvider,
        context,
        targetFile,
        fileContent,
        0, // First objective
        skillLevel,
        codingBias,
        featureDescription
      );

      // Apply the code modification
      const createdFilePath = await applyCodeModification(modification, projectPath, false);

      // Store TODOs in state registry
      const todoRecords: TodoRecord[] = modification.todos.map((todo) => ({
        id: todo.id,
        moduleId: context.currentModule.id,
        objectiveIndex: todo.objectiveIndex,
        task: todo.task,
        successCriteria: todo.successCriteria,
        filePath: modification.filePath,
        line: todo.line,
        createdAt: new Date().toISOString(),
        status: 'pending' as const,
      }));

      if (todoRecords.length > 0) {
        await updateState(statePath, {
          addTodos: todoRecords,
        });
      }

      // Validate file path doesn't use curriculum-based naming
      const pathLower = modification.filePath.toLowerCase();
      const hasBadNaming =
        pathLower.includes('module-') ||
        pathLower.includes('lesson-') ||
        pathLower.includes('chapter-') ||
        pathLower.includes('exercise-') ||
        pathLower.includes('practice-') ||
        pathLower.includes('week-');

      const result = {
        success: true,
        vibeCoderReminder:
          '🚀 VIBE CODER MODE: You\'re building YOUR product, YOUR vision. This code is YOURS. Learning happens naturally as you build what you want. Keep steering the direction!',
        ...(hasBadNaming && {
          architectureWarning:
            '⚠️ WARNING: File path contains curriculum-based naming (module-X, lesson-Y, etc). Use product architecture instead (src/auth/, lib/, api/, etc). This should be a REAL product structure.',
        }),
        featureDescription,
        filePath: modification.filePath,
        absolutePath: createdFilePath,
        explanation: modification.explanation,
        scaffolding: {
          codingBias,
          skillLevel,
          hintsUsed: progress.hintsUsed,
          solutionsUsed: progress.solutionsUsed,
        },
        module: {
          id: context.currentModule.id,
          title: context.currentModule.title,
          objectives: context.currentModule.objectives,
        },
        todos: modification.todos.map((todo) => ({
          id: todo.id,
          objectiveIndex: todo.objectiveIndex,
          objective: context.currentModule.objectives[todo.objectiveIndex] || 'Unknown objective',
          task: todo.task,
          successCriteria: todo.successCriteria,
          line: todo.line,
        })),
        nextSteps: [
          'Review the code - this is YOUR product feature taking shape',
          'Each TODO has SUCCESS CRITERIA - complete them to finish YOUR feature',
          'This code is YOURS - modify it however you want to match your vision',
          `Use codetandem_review_code with todoId (e.g., "${modification.todos[0]?.id}") when ready`,
          'Use codetandem_get_hint if stuck (applies -0.5 penalty)',
          'Keep building YOUR product YOUR way - you\'re the vibe coder in charge!',
        ],
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

export const projectTools: Record<string, ToolDefinition> = {
  codetandem_create_project_files: createProjectFilesTool,
  codetandem_create_feature: createFeatureTool,
};
