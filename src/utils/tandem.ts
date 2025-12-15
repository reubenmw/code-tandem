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
 * @returns Formatted prompt string for the AI
 */
export function buildCodingPrompt(
  context: ProjectContext,
  targetFile?: string,
  fileContent?: string,
  objectiveIndex: number = 0,
  skillLevel: number = 0.0
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

  // Task instructions with dynamic scaffolding based on skill level
  promptParts.push('# Your Task');
  promptParts.push('Write foundational code that:');
  promptParts.push('1. Implements the basic structure needed for the learning objective');
  promptParts.push('2. Includes a clear TODO comment for the user to complete');
  promptParts.push('3. Leaves the most educationally valuable part for the user to implement');
  promptParts.push('');

  // Dynamic scaffolding based on skill level
  promptParts.push('# Scaffolding Level');
  if (skillLevel < 3.0) {
    // Beginner: High scaffolding with detailed help
    promptParts.push('User skill level: BEGINNER');
    promptParts.push('Provide DETAILED scaffolding:');
    promptParts.push('- Write comprehensive foundational code');
    promptParts.push('- Include detailed TODO comments with step-by-step hints');
    promptParts.push('- Provide code snippets or examples in the TODO comment');
    promptParts.push('- Break down complex tasks into smaller, manageable steps');
    promptParts.push('- Add inline comments explaining key concepts');
  } else if (skillLevel < 7.0) {
    // Intermediate: Medium scaffolding with goal-oriented guidance
    promptParts.push('User skill level: INTERMEDIATE');
    promptParts.push('Provide GOAL-ORIENTED scaffolding:');
    promptParts.push('- Write solid foundational code structure');
    promptParts.push('- Include clear TODO comments describing the goal');
    promptParts.push('- Provide hints about the approach, but not full implementations');
    promptParts.push('- Let the user figure out implementation details');
    promptParts.push('- Add comments only for non-obvious design decisions');
  } else {
    // Advanced: Low scaffolding with conceptual guidance
    promptParts.push('User skill level: ADVANCED');
    promptParts.push('Provide CONCEPTUAL scaffolding:');
    promptParts.push('- Write minimal foundational code (interfaces, types)');
    promptParts.push('- Include high-level TODO comments describing the concept');
    promptParts.push('- Focus on architecture and design patterns');
    promptParts.push('- Let the user implement most of the functionality');
    promptParts.push('- Assume the user understands implementation details');
  }
  promptParts.push('');

  promptParts.push('Format your response as JSON with this structure:');
  promptParts.push('{');
  promptParts.push('  "file_path": "relative/path/to/file.ext",');
  promptParts.push('  "code": "complete file content with TODO",');
  promptParts.push('  "todo_line": 10,');
  promptParts.push('  "todo_task": "Brief description of what the user should implement",');
  promptParts.push('  "explanation": "Brief explanation of what you implemented"');
  promptParts.push('}');
  promptParts.push('');
  promptParts.push('The TODO comment should be formatted as:');
  promptParts.push(`// TODO: [${context.currentModule.id}] <task description>`);

  return promptParts.join('\n');
}

export interface CodeModification {
  filePath: string;
  code: string;
  todoLine: number;
  todoTask: string;
  explanation: string;
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

  // Validate required fields
  const requiredFields = ['file_path', 'code', 'todo_line', 'todo_task', 'explanation'];
  const missing = requiredFields.filter((field) => !(field in data));

  if (missing.length > 0) {
    throw new Error(`Missing required fields in AI response: ${missing.join(', ')}`);
  }

  // Create modification object
  return {
    filePath: String(data.file_path),
    code: String(data.code),
    todoLine: Number(data.todo_line),
    todoTask: String(data.todo_task),
    explanation: String(data.explanation),
  };
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
 * @returns CodeModification object
 * @throws Error if AI response is invalid
 */
export async function generateCodeWithAI(
  provider: BaseAIProvider,
  context: ProjectContext,
  targetFile?: string,
  fileContent?: string,
  objectiveIndex: number = 0,
  skillLevel: number = 0.0
): Promise<CodeModification> {
  // Build prompt with skill level
  const prompt = buildCodingPrompt(context, targetFile, fileContent, objectiveIndex, skillLevel);

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
