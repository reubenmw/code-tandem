/**
 * Project state type definitions
 */

export interface FileTree {
  [key: string]: string | FileTree;
}

export interface StateData {
  version: string;
  createdAt: string;
  updatedAt: string;
  currentModuleId: string;
  skillScores: Record<string, number>;
  completedModules: string[];
  projectTree?: FileTree;
  hints?: Record<string, number>;
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
}
