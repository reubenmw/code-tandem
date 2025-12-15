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

  // Update current module
  if (options.currentModuleId !== undefined) {
    state.currentModuleId = options.currentModuleId;
  }

  // Update skill score for current module
  if (options.skillScore !== undefined) {
    const currentId = state.currentModuleId;
    state.skillScores[currentId] = options.skillScore;
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

  // Update hint count
  if (options.hintCount !== undefined) {
    const currentId = state.currentModuleId;
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
