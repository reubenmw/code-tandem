/**
 * Project Management MCP Tools
 */

import { mkdir, writeFile, readFile } from 'fs/promises';
import { join, resolve } from 'path';
import chalk from 'chalk';
import { loadState, getCurrentModuleId, getModuleProgress } from '../../utils/state.js';
import { loadModules, getModuleById } from '../../utils/modules.js';
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
  description: 'Create project files for the current module objectives.',
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
 */
const createFeatureTool: ToolDefinition = {
  name: 'codetandem_create_feature',
  description:
    'Create a feature with curriculum-aligned code and TODOs. The AI balances how much code to write vs. how much the user should complete based on their current module position and skill level. Use this when the user wants to build a feature.',
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

      const result = {
        success: true,
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
          'Review the generated code to understand the structure',
          'Each TODO has SUCCESS CRITERIA comments above it - read them carefully',
          'Complete the TODO tasks to implement the key learning objectives',
          `Use codetandem_review_code with todoId (e.g., "${modification.todos[0]?.id}") when ready to submit`,
          'Use codetandem_get_hint if you get stuck (applies -0.5 penalty)',
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
