/**
 * Project state type definitions
 */

export interface FileTree {
  [key: string]: string | FileTree;
}

export interface TodoRecord {
  id: string; // e.g., "obj-1"
  moduleId: string; // Which module this TODO belongs to
  objectiveIndex: number; // Which objective (0-based)
  task: string; // Task description
  successCriteria: string[]; // Measurable success criteria
  filePath: string; // Where the TODO is located
  line: number; // Line number in file
  createdAt: string; // When TODO was created
  completedAt?: string; // When TODO was completed
  status: 'pending' | 'completed' | 'failed'; // Current status
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

export interface UserMistake {
  id: string; // unique ID for this mistake
  moduleId: string; // which module
  objectiveIndex: number; // which objective (0-based)
  todoId?: string; // which TODO (if applicable)
  timestamp: string; // when it happened
  weaknessArea: string; // area of weakness (e.g., "syntax", "logic", "incomplete implementation", "incorrect algorithm")
  description: string; // what went wrong
  reviewFeedback: string; // AI feedback from review
  reviewScore: number; // score received
  suggestions: string[]; // suggestions from AI
}

export interface StateData {
  version: string;
  createdAt: string;
  updatedAt: string;
  currentModuleId: string;
  skillScores: Record<string, number>;
  completedModules: string[];
  moduleProgress?: Record<string, ModuleProgress>; // Track objectives per module
  todos?: Record<string, TodoRecord>; // Track all TODOs with their success criteria (key is todo ID)
  userMistakes?: UserMistake[]; // Track user mistakes for AI to learn weaknesses
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
  addTodos?: TodoRecord[]; // Add new TODOs to registry
  updateTodo?: { id: string; updates: Partial<TodoRecord> }; // Update existing TODO
  addMistake?: UserMistake; // Record user mistake for AI learning
}
