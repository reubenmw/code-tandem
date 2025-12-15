/**
 * Project state type definitions
 */

export interface FileTree {
  [key: string]: string | FileTree;
}

export interface ObjectiveCompletion {
  objectiveId: string;
  objectiveText: string;
  todoId?: string;
  completedAt: string;
  score: number;
  hintsUsed: number;
  solutionsUsed: number;
}

export interface ModuleProgress {
  attempts: number;
  objectivesCompleted: ObjectiveCompletion[];
  hintsUsed: number;
  solutionsUsed: number;
  bestScore: number;
}

export interface StateData {
  version: string;
  createdAt: string;
  updatedAt: string;
  currentModuleId: string;
  skillScores: Record<string, number>;
  completedModules: string[];
  moduleProgress?: Record<string, ModuleProgress>; // Track objectives per module
  projectTree?: FileTree;
  hints?: Record<string, number>; // DEPRECATED: Use moduleProgress instead
  difficultyOverride?: 'easy' | 'medium' | 'hard';
  assessmentPending?: boolean;
  metadata?: {
    totalModules?: number;
    projectPath?: string;
    [key: string]: unknown;
  };
}

export interface UpdateStateOptions {
  currentModuleId?: string;
  skillScore?: number;
  completedModuleId?: string;
  projectTree?: FileTree;
  hintCount?: number;
  difficultyOverride?: 'easy' | 'medium' | 'hard';
  assessmentPending?: boolean;
  objectiveCompletion?: ObjectiveCompletion;
  incrementHints?: boolean;
  incrementSolutions?: boolean;
}
