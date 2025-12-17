/**
 * Project state management
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { StateData, UpdateStateOptions, FileTree } from '../types/state.js';

/**
 * Load state from codetandem.state.json file
 */
export async function loadState(statePath: string): Promise<StateData> {
  try {
    const content = await readFile(statePath, 'utf-8');
    const data = JSON.parse(content) as StateData;

    // Validate required fields
    const requiredFields: (keyof StateData)[] = [
      'currentModuleId',
      'skillScores',
      'completedModules',
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Invalid state.json: missing '${field}' field`);
      }
    }

    return data;
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === 'ENOENT') {
      throw new Error(`State file not found: ${statePath}`);
    }
    throw error;
  }
}

/**
 * Save state to file
 */
async function saveState(statePath: string, state: StateData): Promise<void> {
  // Ensure directory exists
  await mkdir(dirname(statePath), { recursive: true });

  // Write state file
  await writeFile(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

/**
 * Generate initial state file
 */
export async function generateInitialState(options: {
  modulesPath: string;
  projectPath: string;
  outputPath: string;
  initialSkillScore?: number;
  firstModuleId: string;
  totalModules: number;
  projectTree?: FileTree;
}): Promise<StateData> {
  const {
    outputPath,
    initialSkillScore = 0.0,
    firstModuleId,
    totalModules,
    projectTree,
    projectPath,
  } = options;

  const now = new Date().toISOString();

  const stateData: StateData = {
    version: '1.0',
    createdAt: now,
    updatedAt: now,
    currentModuleId: firstModuleId,
    skillScores: { [firstModuleId]: initialSkillScore },
    completedModules: [],
    projectTree,
    metadata: {
      totalModules,
      projectPath,
    },
  };

  await saveState(outputPath, stateData);
  return stateData;
}

/**
 * Update an existing state file
 */
export async function updateState(
  statePath: string,
  options: UpdateStateOptions
): Promise<StateData> {
  const state = await loadState(statePath);
  const currentId = state.currentModuleId;

  // Initialize moduleProgress if needed
  if (!state.moduleProgress) {
    state.moduleProgress = {};
  }
  if (!state.moduleProgress[currentId]) {
    state.moduleProgress[currentId] = {
      attempts: 0,
      objectivesCompleted: [],
      hintsUsed: 0,
      solutionsUsed: 0,
      bestScore: 0,
    };
  }

  // Update current module
  if (options.currentModuleId !== undefined) {
    state.currentModuleId = options.currentModuleId;
  }

  // Update skill score for current module
  if (options.skillScore !== undefined) {
    state.skillScores[currentId] = options.skillScore;
    // Update best score
    if (options.skillScore > state.moduleProgress[currentId]!.bestScore) {
      state.moduleProgress[currentId]!.bestScore = options.skillScore;
    }
  }

  // Record objective completion
  if (options.objectiveCompletion !== undefined) {
    const progress = state.moduleProgress[currentId]!;

    // Check if objective already completed (by objectiveId or todoId)
    const alreadyCompleted = progress.objectivesCompleted.some(
      (obj) =>
        obj.objectiveId === options.objectiveCompletion!.objectiveId ||
        (obj.todoId && obj.todoId === options.objectiveCompletion!.todoId)
    );

    if (!alreadyCompleted) {
      progress.objectivesCompleted.push(options.objectiveCompletion);
    }
  }

  // Increment hints used
  if (options.incrementHints) {
    state.moduleProgress[currentId]!.hintsUsed += 1;
  }

  // Increment solutions used
  if (options.incrementSolutions) {
    state.moduleProgress[currentId]!.solutionsUsed += 1;
  }

  // Mark module as completed
  if (options.completedModuleId !== undefined) {
    if (!state.completedModules.includes(options.completedModuleId)) {
      state.completedModules.push(options.completedModuleId);
    }
  }

  // Update project tree
  if (options.projectTree !== undefined) {
    state.projectTree = options.projectTree;
  }

  // Update hint count (DEPRECATED - kept for backward compatibility)
  if (options.hintCount !== undefined) {
    if (!state.hints) {
      state.hints = {};
    }
    state.hints[currentId] = options.hintCount;
  }

  // Update difficulty override
  if (options.difficultyOverride !== undefined) {
    state.difficultyOverride = options.difficultyOverride;
  }

  // Update assessment pending status
  if (options.assessmentPending !== undefined) {
    state.assessmentPending = options.assessmentPending;
  }

  // Add new TODOs to registry
  if (options.addTodos && options.addTodos.length > 0) {
    if (!state.todos) {
      state.todos = {};
    }
    for (const todo of options.addTodos) {
      state.todos[todo.id] = todo;
    }
  }

  // Update existing TODO
  if (options.updateTodo) {
    if (!state.todos) {
      state.todos = {};
    }
    const existing = state.todos[options.updateTodo.id];
    if (existing) {
      state.todos[options.updateTodo.id] = {
        ...existing,
        ...options.updateTodo.updates,
      };
    }
  }

  // Record user mistake
  if (options.addMistake) {
    if (!state.userMistakes) {
      state.userMistakes = [];
    }
    state.userMistakes.push(options.addMistake);
  }

  // Update timestamp
  state.updatedAt = new Date().toISOString();

  // Save updated state
  await saveState(statePath, state);

  return state;
}

/**
 * Get the current module ID from state
 */
export function getCurrentModuleId(state: StateData): string {
  return state.currentModuleId;
}

/**
 * Get the skill score for a module
 */
export function getSkillScore(state: StateData, moduleId: string): number {
  return state.skillScores[moduleId] ?? 0.0;
}

/**
 * Check if a module is completed
 */
export function isModuleCompleted(state: StateData, moduleId: string): boolean {
  return state.completedModules.includes(moduleId);
}

/**
 * Get the hint count for a module
 */
export function getHintCount(state: StateData, moduleId: string): number {
  return state.hints?.[moduleId] ?? 0;
}

/**
 * Increment the skill score for a module
 */
export async function incrementSkillScore(
  statePath: string,
  moduleId: string,
  points: number
): Promise<number> {
  const state = await loadState(statePath);

  const currentScore = state.skillScores[moduleId] ?? 0.0;
  const newScore = currentScore + points;

  // Update the score
  state.skillScores[moduleId] = newScore;
  state.updatedAt = new Date().toISOString();

  // Save updated state
  await saveState(statePath, state);

  return newScore;
}

/**
 * Get module progress for a specific module
 */
export function getModuleProgress(state: StateData, moduleId: string) {
  return (
    state.moduleProgress?.[moduleId] ?? {
      attempts: 0,
      objectivesCompleted: [],
      hintsUsed: 0,
      solutionsUsed: 0,
      bestScore: 0,
    }
  );
}

/**
 * Check if all objectives are completed for a module
 */
export function areAllObjectivesCompleted(
  state: StateData,
  moduleId: string,
  totalObjectives: number
): boolean {
  const progress = getModuleProgress(state, moduleId);
  return progress.objectivesCompleted.length >= totalObjectives;
}

/**
 * Calculate proficiency penalty based on hints and solutions used
 */
export function calculateProficiencyPenalty(hintsUsed: number, solutionsUsed: number): number {
  // Each hint reduces score by 0.5 points
  // Each solution reduces score by 1.5 points
  const hintPenalty = hintsUsed * 0.5;
  const solutionPenalty = solutionsUsed * 1.5;
  return Math.min(hintPenalty + solutionPenalty, 3.0); // Max 3 point penalty
}

/**
 * Get a TODO record by ID
 */
export function getTodoById(state: StateData, todoId: string): import('../types/state.js').TodoRecord | undefined {
  return state.todos?.[todoId];
}

/**
 * Get all TODOs for a specific module
 */
export function getTodosByModule(state: StateData, moduleId: string): import('../types/state.js').TodoRecord[] {
  if (!state.todos) return [];
  return Object.values(state.todos).filter((todo) => todo.moduleId === moduleId);
}

/**
 * Get all pending TODOs
 */
export function getPendingTodos(state: StateData): import('../types/state.js').TodoRecord[] {
  if (!state.todos) return [];
  return Object.values(state.todos).filter((todo) => todo.status === 'pending');
}

/**
 * Get all user mistakes
 */
export function getUserMistakes(state: StateData): import('../types/state.js').UserMistake[] {
  return state.userMistakes || [];
}

/**
 * Get user mistakes for a specific module
 */
export function getMistakesByModule(state: StateData, moduleId: string): import('../types/state.js').UserMistake[] {
  if (!state.userMistakes) return [];
  return state.userMistakes.filter((mistake) => mistake.moduleId === moduleId);
}

/**
 * Get user mistakes for a specific objective
 */
export function getMistakesByObjective(state: StateData, moduleId: string, objectiveIndex: number): import('../types/state.js').UserMistake[] {
  if (!state.userMistakes) return [];
  return state.userMistakes.filter(
    (mistake) => mistake.moduleId === moduleId && mistake.objectiveIndex === objectiveIndex
  );
}

/**
 * Get weakness areas with frequency count
 */
export function getWeaknessAreas(state: StateData, moduleId?: string): Record<string, number> {
  const mistakes = moduleId ? getMistakesByModule(state, moduleId) : getUserMistakes(state);
  const weaknesses: Record<string, number> = {};

  for (const mistake of mistakes) {
    weaknesses[mistake.weaknessArea] = (weaknesses[mistake.weaknessArea] || 0) + 1;
  }

  return weaknesses;
}
