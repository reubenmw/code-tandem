/**
 * Core tandem coding loop functionality.
 *
 * Provides the main logic for AI-assisted pair programming with dynamic scaffolding.
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import type { Module } from './curriculum.js';
import { getModuleById, loadModules } from './modules.js';
import { BaseAIProvider } from '../providers/base.js';
import type { StateData } from '../types/state.js';
import { getCurrentModuleId, loadState } from './state.js';

export interface ProjectContext {
  state: StateData;
  modules: Module[];
  currentModule: Module;
  projectPath: string;
}

/**
 * Load project context from modules.json and state.json.
 *
 * @param projectPath Path to the project root directory
 * @param modulesFile Name of modules file (default: modules.json)
 * @param stateFile Name of state file (default: codetandem.state.json)
 * @returns ProjectContext object with all loaded information
 * @throws Error if required files are not found or invalid
 */
export async function loadProjectContext(
  projectPath: string,
  modulesFile: string = 'modules.json',
  stateFile: string = 'codetandem.state.json'
): Promise<ProjectContext> {
  const resolvedPath = resolve(projectPath);

  // Load modules
  const modulesPath = resolve(resolvedPath, modulesFile);
  const modules = await loadModules(modulesPath);

  if (modules.length === 0) {
    throw new Error('No modules found in modules.json');
  }

  // Load state
  const statePath = resolve(resolvedPath, stateFile);
  const state = await loadState(statePath);

  // Get current module
  const currentModuleId = getCurrentModuleId(state);
  const currentModule = getModuleById(modules, currentModuleId);

  return {
    state,
    modules,
    currentModule,
    projectPath: resolvedPath,
  };
}

/**
 * Get the index of the next objective to work on.
 *
 * @param context Project context
 * @returns Index of next objective, or null if all completed
 */
export function getNextObjectiveIndex(context: ProjectContext): number | null {
  // For now, return the first objective
  // In future, this could track which objectives are completed
  if (context.currentModule.objectives.length > 0) {
    return 0;
  }
  return null;
}

/**
 * Format module information for display.
 *
 * @param context Project context
 * @returns Formatted string with module info
 */
export function formatModuleInfo(context: ProjectContext): string {
  const lines: string[] = [];
  lines.push(`Module: ${context.currentModule.title}`);
  lines.push(`ID: ${context.currentModule.id}`);

  if (context.currentModule.objectives.length > 0) {
    lines.push('\nObjectives:');
    for (let i = 0; i < context.currentModule.objectives.length; i++) {
      lines.push(`  ${i + 1}. ${context.currentModule.objectives[i]}`);
    }
  }

  return lines.join('\n');
}

/**
 * Build a comprehensive prompt for AI code generation with dynamic scaffolding.
 *
 * @param context Project context
 * @param targetFile Optional target file path (relative to project)
 * @param fileContent Optional current content of target file
 * @param objectiveIndex Index of the objective to work on (default: 0)
 * @param skillLevel User's skill score for current module (0-10)
 * @param codingBias Scaffolding level (guided/balanced/independent)
 * @param featureDescription Optional feature description from user
 * @returns Formatted prompt string for the AI
 */
export function buildCodingPrompt(
  context: ProjectContext,
  targetFile?: string,
  fileContent?: string,
  objectiveIndex: number = 0,
  skillLevel: number = 0.0,
  codingBias: 'guided' | 'balanced' | 'independent' = 'balanced',
  featureDescription?: string
): string {
  const objective =
    objectiveIndex < context.currentModule.objectives.length
      ? context.currentModule.objectives[objectiveIndex]
      : null;

  const promptParts: string[] = [];

  // System context
  promptParts.push(
    'You are CodeTandem, an AI pair programming assistant that helps users learn by writing foundational code and leaving TODO tasks for them to complete.'
  );
  promptParts.push('');

  // Current learning module
  promptParts.push('# Current Learning Module');
  promptParts.push(`Module: ${context.currentModule.title}`);
  promptParts.push(`Module ID: ${context.currentModule.id}`);
  promptParts.push('');

  // Learning objective
  if (objective) {
    promptParts.push('# Current Learning Objective');
    promptParts.push(objective);
    promptParts.push('');
  }

  // All objectives for context
  if (context.currentModule.objectives.length > 0) {
    promptParts.push('# All Module Objectives');
    for (let i = 0; i < context.currentModule.objectives.length; i++) {
      const marker = i === objectiveIndex ? '→' : ' ';
      promptParts.push(`${marker} ${i + 1}. ${context.currentModule.objectives[i]}`);
    }
    promptParts.push('');
  }

  // Target file information
  if (targetFile) {
    promptParts.push('# Target File');
    promptParts.push(`File: ${targetFile}`);
    promptParts.push('');

    if (fileContent !== undefined) {
      promptParts.push('# Current File Content');
      promptParts.push('```');
      promptParts.push(fileContent || '# Empty file');
      promptParts.push('```');
      promptParts.push('');
    }
  }

  // Feature description if provided
  if (featureDescription) {
    promptParts.push('# Feature Request');
    promptParts.push(`The user wants to build: ${featureDescription}`);
    promptParts.push('');
  }

  // Task instructions with dynamic scaffolding based on skill level
  promptParts.push('# Your Task');
  if (featureDescription) {
    promptParts.push('Write foundational code that:');
    promptParts.push('1. Implements this feature in a way that aligns with the current learning objectives');
    promptParts.push('2. Balances AI-written code with user TODOs based on the skill level and coding bias');
    promptParts.push('3. Links TODOs to the current module objectives where appropriate');
    promptParts.push('4. Provides educational value by leaving the most relevant parts for the user to complete');
  } else {
    promptParts.push('Write foundational code that:');
    promptParts.push('1. Implements the basic structure needed for the learning objective');
    promptParts.push('2. Includes a clear TODO comment for the user to complete');
    promptParts.push('3. Leaves the most educationally valuable part for the user to implement');
  }
  promptParts.push('');

  // Dynamic scaffolding based on skill level and coding bias
  promptParts.push('# Scaffolding Level');
  promptParts.push(`User skill level: ${skillLevel.toFixed(1)}/10.0`);
  promptParts.push(`User coding bias: ${codingBias}`);

  if (codingBias === 'guided') {
    promptParts.push('Provide DETAILED scaffolding:');
    promptParts.push('- Write comprehensive foundational code');
    promptParts.push('- Include detailed TODO comments with step-by-step hints');
    promptParts.push('- Provide code snippets or examples in the TODO comment');
  } else if (codingBias === 'balanced') {
    promptParts.push('Provide BALANCED scaffolding:');
    promptParts.push('- Write solid foundational code structure');
    promptParts.push('- Include clear TODO comments describing the goal');
    promptParts.push('- Let the user figure out implementation details');
  } else {
    // independent
    promptParts.push('Provide CONCEPTUAL scaffolding:');
    promptParts.push('- Write minimal foundational code (interfaces, types)');
    promptParts.push('- Include high-level TODO comments describing the concept');
    promptParts.push('- Let the user implement most of the functionality');
  }
  promptParts.push('');

  promptParts.push('Format your response as JSON with this structure:');
  promptParts.push('{');
  promptParts.push('  "file_path": "relative/path/to/file.ext",');
  promptParts.push('  "code": "complete file content with TODOs and success criteria",');
  promptParts.push('  "todos": [');
  promptParts.push('    {');
  promptParts.push('      "id": "obj-1",');
  promptParts.push('      "objectiveIndex": 0,');
  promptParts.push('      "task": "Brief description of what the user should implement",');
  promptParts.push('      "successCriteria": [');
  promptParts.push('        "Specific criterion 1 that must be met",');
  promptParts.push('        "Specific criterion 2 that must be met"');
  promptParts.push('      ],');
  promptParts.push('      "line": 10');
  promptParts.push('    }');
  promptParts.push('  ],');
  promptParts.push('  "explanation": "Brief explanation of what you implemented"');
  promptParts.push('}');
  promptParts.push('');
  promptParts.push('**IMPORTANT TODO Format Rules:**');
  promptParts.push('');
  promptParts.push('1. Each TODO must use format: // TODO: [obj-X] <task description>');
  promptParts.push('   - Where X is the objective number (1-based index)');
  promptParts.push(`   - Example: // TODO: [obj-1] Implement password validation`);
  promptParts.push('');
  promptParts.push('2. Include success criteria as comments ABOVE each TODO:');
  promptParts.push('   ```');
  promptParts.push('   // SUCCESS CRITERIA for [obj-1]:');
  promptParts.push('   // - Must validate password is at least 8 characters');
  promptParts.push('   // - Must check for at least one uppercase letter');
  promptParts.push('   // - Must return boolean true/false');
  promptParts.push('   // TODO: [obj-1] Implement password validation');
  promptParts.push('   ```');
  promptParts.push('');
  promptParts.push('3. Link each TODO to a specific learning objective from the module');
  promptParts.push('');
  promptParts.push(
    '4. Success criteria should be measurable, specific, and tied to the learning objective'
  );

  return promptParts.join('\n');
}

export interface TodoMetadata {
  id: string; // e.g., "obj-1"
  objectiveIndex: number;
  task: string;
  successCriteria: string[];
  line: number;
}

export interface CodeModification {
  filePath: string;
  code: string;
  todos: TodoMetadata[];
  explanation: string;
  // Legacy fields for backward compatibility
  todoLine?: number;
  todoTask?: string;
}

/**
 * Parse AI response to extract code modification.
 *
 * @param responseText Raw text response from AI
 * @returns CodeModification object
 * @throws Error if response format is invalid
 */
export function parseCodeModification(responseText: string): CodeModification {
  let text = responseText.trim();

  // Remove markdown code blocks if present
  if (text.startsWith('```json')) {
    text = text.substring(7);
  } else if (text.startsWith('```')) {
    text = text.substring(3);
  }

  if (text.endsWith('```')) {
    text = text.substring(0, text.length - 3);
  }

  text = text.trim();

  // Parse JSON
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    throw new Error(`Invalid JSON in AI response: ${error}`);
  }

  // Check for new format (with todos array)
  if ('todos' in data && Array.isArray(data.todos)) {
    // New format
    const requiredFields = ['file_path', 'code', 'todos', 'explanation'];
    const missing = requiredFields.filter((field) => !(field in data));

    if (missing.length > 0) {
      throw new Error(`Missing required fields in AI response: ${missing.join(', ')}`);
    }

    const todos = (data.todos as unknown[]).map((todo: any) => ({
      id: String(todo.id),
      objectiveIndex: Number(todo.objectiveIndex),
      task: String(todo.task),
      successCriteria: Array.isArray(todo.successCriteria)
        ? (todo.successCriteria as string[])
        : [],
      line: Number(todo.line),
    }));

    return {
      filePath: String(data.file_path),
      code: String(data.code),
      todos,
      explanation: String(data.explanation),
      // Legacy fields for backward compatibility
      todoLine: todos[0]?.line,
      todoTask: todos[0]?.task,
    };
  } else {
    // Legacy format (backward compatibility)
    const requiredFields = ['file_path', 'code', 'todo_line', 'todo_task', 'explanation'];
    const missing = requiredFields.filter((field) => !(field in data));

    if (missing.length > 0) {
      throw new Error(`Missing required fields in AI response: ${missing.join(', ')}`);
    }

    return {
      filePath: String(data.file_path),
      code: String(data.code),
      todos: [
        {
          id: 'obj-1', // Default ID for legacy format
          objectiveIndex: 0,
          task: String(data.todo_task),
          successCriteria: [],
          line: Number(data.todo_line),
        },
      ],
      explanation: String(data.explanation),
      todoLine: Number(data.todo_line),
      todoTask: String(data.todo_task),
    };
  }
}

/**
 * Generate code using AI provider.
 *
 * @param provider AI provider instance
 * @param context Project context
 * @param targetFile Optional target file path
 * @param fileContent Optional current file content
 * @param objectiveIndex Index of objective to work on
 * @param skillLevel User's skill score for current module (0-10)
 * @param codingBias Scaffolding level (guided/balanced/independent)
 * @param featureDescription Optional feature description from user
 * @returns CodeModification object
 * @throws Error if AI response is invalid
 */
export async function generateCodeWithAI(
  provider: BaseAIProvider,
  context: ProjectContext,
  targetFile?: string,
  fileContent?: string,
  objectiveIndex: number = 0,
  skillLevel: number = 0.0,
  codingBias: 'guided' | 'balanced' | 'independent' = 'balanced',
  featureDescription?: string
): Promise<CodeModification> {
  // Build prompt with skill level, coding bias, and feature description
  const prompt = buildCodingPrompt(
    context,
    targetFile,
    fileContent,
    objectiveIndex,
    skillLevel,
    codingBias,
    featureDescription
  );

  // Get AI response
  const response = await provider.generateCodeSuggestion(prompt, {
    temperature: 0.7,
  });

  // Parse response
  return parseCodeModification(response.content);
}

/**
 * Apply code modification to the project.
 *
 * @param modification CodeModification object
 * @param projectPath Path to project root
 * @param dryRun If true, don't actually write files
 * @returns Absolute path to the modified file
 */
export async function applyCodeModification(
  modification: CodeModification,
  projectPath: string,
  dryRun: boolean = false
): Promise<string> {
  // Resolve file path
  const filePath = resolve(projectPath, modification.filePath);

  if (!dryRun) {
    // Ensure parent directory exists
    await mkdir(dirname(filePath), { recursive: true });

    // Write the file
    await writeFile(filePath, modification.code, 'utf-8');
  }

  return filePath;
}
