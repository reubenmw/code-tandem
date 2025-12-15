# CodeTandem API Documentation

This document describes the programmatic API for CodeTandem, allowing you to integrate it into your own tools and applications.

## Table of Contents

- [Installation](#installation)
- [Core Modules](#core-modules)
- [AI Providers](#ai-providers)
- [State Management](#state-management)
- [Curriculum Management](#curriculum-management)
- [Code Analysis](#code-analysis)
- [Configuration](#configuration)
- [Examples](#examples)

## Installation

```bash
npm install codetandem
```

## Core Modules

### Importing

```typescript
// ES Modules
import {
  BaseAIProvider,
  createProvider,
  loadState,
  updateState,
  parseCurriculum,
  extractTodoCode,
  reviewCodeWithAI
} from 'codetandem';

// CommonJS
const codetandem = require('codetandem');
```

## AI Providers

### BaseAIProvider

Abstract base class for AI provider implementations.

```typescript
import { BaseAIProvider, AIContext, AIResponse } from 'codetandem';

abstract class BaseAIProvider {
  constructor(config: ProviderConfig);
  
  abstract generateCodeSuggestion(
    prompt: string,
    context?: AIContext,
    temperature?: number
  ): Promise<AIResponse>;
  
  abstract reviewCode(
    codeSnippet: string,
    context?: AIContext
  ): Promise<AIResponse>;
  
  abstract chat(
    messages: ChatMessage[],
    temperature?: number
  ): Promise<AIResponse>;
}
```

### Creating a Provider

```typescript
import { createProvider, ProviderConfig } from 'codetandem';

const config: ProviderConfig = {
  provider: 'openai',
  model: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY!
};

const provider = await createProvider(config);
```

### Using a Provider

```typescript
// Generate code suggestions
const response = await provider.generateCodeSuggestion(
  'Write a function to calculate factorial',
  {
    language: 'javascript',
    filePath: 'src/math.js',
    description: 'Mathematical utilities'
  },
  0.7
);

console.log(response.content);

// Review code
const reviewResponse = await provider.reviewCode(
  'function factorial(n) { return n * factorial(n-1); }',
  {
    language: 'javascript',
    requirements: 'Should handle edge cases'
  }
);

console.log(reviewResponse.content);
```

### Provider Types

```typescript
type ProviderType = 'openai' | 'anthropic' | 'google';

interface ProviderConfig {
  provider: ProviderType;
  model: string;
  apiKey: string;
}

interface AIContext {
  filePath?: string;
  language?: string;
  description?: string;
  requirements?: string;
  temperature?: number;
}

interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

## State Management

### Loading State

```typescript
import { loadState, StateData } from 'codetandem';

const state = await loadState('./codetandem.state.json');

console.log('Current module:', state.currentModuleId);
console.log('Skill score:', state.skillScores[state.currentModuleId]);
console.log('Completed:', state.completedModules);
```

### Updating State

```typescript
import { updateState, UpdateStateOptions } from 'codetandem';

const updatedState = await updateState('./codetandem.state.json', {
  currentModuleId: 'functions',
  skillScore: 7.5,
  completedModuleId: 'variables'
});
```

### Creating Initial State

```typescript
import { generateInitialState } from 'codetandem';

const state = await generateInitialState({
  modulesPath: './modules.json',
  projectPath: process.cwd(),
  outputPath: './codetandem.state.json',
  initialSkillScore: 0.0,
  firstModuleId: 'introduction',
  totalModules: 10
});
```

### State Utilities

```typescript
import {
  getCurrentModuleId,
  getSkillScore,
  isModuleCompleted,
  getHintCount,
  incrementSkillScore
} from 'codetandem';

// Get current module
const currentModule = getCurrentModuleId(state);

// Get skill score for a module
const score = getSkillScore(state, 'functions');

// Check completion
const isComplete = isModuleCompleted(state, 'variables');

// Get hint count
const hints = getHintCount(state, 'loops');

// Increment skill score
const newScore = await incrementSkillScore(
  './codetandem.state.json',
  'functions',
  1.5
);
```

### State Types

```typescript
interface StateData {
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
    totalModules: number;
    projectPath: string;
  };
}

interface UpdateStateOptions {
  currentModuleId?: string;
  skillScore?: number;
  completedModuleId?: string;
  projectTree?: FileTree;
  hintCount?: number;
  difficultyOverride?: string;
  assessmentPending?: boolean;
}

interface FileTree {
  [key: string]: {
    type: 'file' | 'directory';
    path: string;
    children?: FileTree;
  };
}
```

## Curriculum Management

### Parsing Curriculum

```typescript
import { parseCurriculum, CurriculumParser } from 'codetandem';

const curriculumContent = `
# Introduction to JavaScript

## Variables
- Declare variables
- Use different types

## Functions
- Define functions
- Call functions
`;

const parser = new CurriculumParser();
const modules = parser.parse(curriculumContent);

console.log(modules);
// [
//   {
//     id: 'introduction-to-javascript',
//     title: 'Introduction to JavaScript',
//     objectives: ['Variables', 'Functions']
//   }
// ]
```

### Loading Modules

```typescript
import { loadModules, generateModulesJson } from 'codetandem';

// Generate modules.json from curriculum
const modules = await generateModulesJson(
  './curriculum.md',
  './modules.json'
);

// Load existing modules
const loadedModules = await loadModules('./modules.json');
```

### Module Utilities

```typescript
import { getModuleById, Module } from 'codetandem';

const modules = await loadModules('./modules.json');
const targetModule = getModuleById(modules, 'functions');

console.log(targetModule.title);
console.log(targetModule.objectives);
```

### Module Types

```typescript
interface Module {
  id: string;
  title: string;
  objectives: string[];
}
```

## Code Analysis

### Extracting TODOs

```typescript
import { extractTodoCode, findAllTodos } from 'codetandem';

// Extract code for a specific TODO
const extraction = await extractTodoCode(
  './src/app.js',
  'implement validation'
);

if (extraction) {
  console.log('TODO:', extraction.todoText);
  console.log('Line:', extraction.todoLine);
  console.log('Code:', extraction.code);
}

// Find all TODOs in a file
const todos = await findAllTodos('./src/app.js');
todos.forEach(([lineNum, text]) => {
  console.log(`Line ${lineNum}: ${text}`);
});
```

### Code Review

```typescript
import { reviewCodeWithAI, buildReviewPrompt } from 'codetandem';

const codeExtraction = await extractTodoCode('./src/utils.js');

if (codeExtraction) {
  const review = await reviewCodeWithAI(
    provider,
    codeExtraction,
    'Working with utility functions',
    'Create helper functions for common tasks',
    0.3
  );
  
  console.log('Success:', review.success);
  console.log('Feedback:', review.feedback);
  console.log('Score:', review.score);
  console.log('Suggestions:', review.suggestions);
}

// Build custom review prompt
const prompt = buildReviewPrompt(
  codeExtraction,
  'Module context',
  'Specific objective'
);
```

### Code Analysis Types

```typescript
interface CodeExtraction {
  filePath: string;
  todoLine: number;
  todoText: string;
  code: string;
  startLine: number;
  endLine: number;
}

interface ReviewResult {
  success: boolean;
  feedback: string;
  score?: number;
  suggestions?: string[];
}
```

## Configuration

### Config Manager

```typescript
import { ConfigManager } from 'codetandem';

const config = new ConfigManager();

// Set provider
await config.setProvider('openai');

// Set model
await config.setModel('gpt-4');

// Set API key (securely stored)
await config.setApiKey('openai', process.env.OPENAI_API_KEY!);

// Get provider
const provider = await config.getProvider();

// Get model
const model = await config.getModel();

// Get API key
const apiKey = await config.getApiKey('openai');

// Set custom config value
await config.setConfigValue('customSetting', 'value');

// Get custom config value
const value = await config.getConfigValue('customSetting');

// Get all config
const allConfig = await config.getConfig();
```

## Examples

### Complete Workflow Example

```typescript
import {
  createProvider,
  loadState,
  loadModules,
  extractTodoCode,
  reviewCodeWithAI,
  updateState,
  getModuleById
} from 'codetandem';

async function runCodeReviewWorkflow() {
  // 1. Setup provider
  const provider = await createProvider({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY!
  });
  
  // 2. Load project state
  const state = await loadState('./codetandem.state.json');
  const modules = await loadModules('./modules.json');
  
  // 3. Get current module context
  const currentModule = getModuleById(modules, state.currentModuleId);
  console.log('Working on:', currentModule.title);
  
  // 4. Extract code to review
  const codeExtraction = await extractTodoCode('./src/app.js');
  
  if (!codeExtraction) {
    console.log('No TODOs found');
    return;
  }
  
  // 5. Review the code
  const review = await reviewCodeWithAI(
    provider,
    codeExtraction,
    currentModule.title,
    currentModule.objectives[0]
  );
  
  // 6. Display results
  console.log('Review Result:');
  console.log('Success:', review.success);
  console.log('Feedback:', review.feedback);
  
  if (review.score) {
    console.log('Score:', review.score);
    
    // 7. Update state with new score
    await updateState('./codetandem.state.json', {
      skillScore: review.score
    });
  }
  
  if (review.suggestions) {
    console.log('\nSuggestions:');
    review.suggestions.forEach((s, i) => {
      console.log(`${i + 1}. ${s}`);
    });
  }
}

runCodeReviewWorkflow().catch(console.error);
```

### Custom AI Integration

```typescript
import { BaseAIProvider, AIResponse, AIContext } from 'codetandem';

class CustomAIProvider extends BaseAIProvider {
  async generateCodeSuggestion(
    prompt: string,
    context?: AIContext,
    temperature = 0.7
  ): Promise<AIResponse> {
    // Custom implementation
    const fullPrompt = `${this.buildContextPrompt(context)}\n\n${prompt}`;
    
    // Call your custom AI service
    const response = await myCustomAI.generate(fullPrompt, {
      model: this.model,
      temperature
    });
    
    return {
      content: response.text,
      usage: response.usage
    };
  }
  
  async reviewCode(
    codeSnippet: string,
    context?: AIContext
  ): Promise<AIResponse> {
    // Custom review implementation
    const prompt = `Review this code:\n\n${codeSnippet}`;
    return this.generateCodeSuggestion(prompt, context, 0.3);
  }
  
  async chat(
    messages: ChatMessage[],
    temperature = 0.7
  ): Promise<AIResponse> {
    // Custom chat implementation
    const response = await myCustomAI.chat(messages, { temperature });
    return { content: response.text };
  }
}

// Use custom provider
const customProvider = new CustomAIProvider({
  apiKey: 'custom-key',
  model: 'custom-model'
});
```

### Progress Tracking Dashboard

```typescript
import { loadState, loadModules, getSkillScore } from 'codetandem';

async function generateProgressReport() {
  const state = await loadState('./codetandem.state.json');
  const modules = await loadModules('./modules.json');
  
  const totalModules = modules.length;
  const completedCount = state.completedModules.length;
  const progressPercent = (completedCount / totalModules) * 100;
  
  console.log('Progress Report');
  console.log('===============');
  console.log(`Completed: ${completedCount}/${totalModules} (${progressPercent.toFixed(1)}%)`);
  console.log(`Current Module: ${state.currentModuleId}`);
  console.log('\nSkill Scores:');
  
  for (const module of modules) {
    const score = getSkillScore(state, module.id);
    const status = state.completedModules.includes(module.id) ? '✓' : ' ';
    console.log(`  [${status}] ${module.title}: ${score.toFixed(1)}/10`);
  }
  
  const avgScore = Object.values(state.skillScores)
    .reduce((a, b) => a + b, 0) / Object.keys(state.skillScores).length;
  
  console.log(`\nAverage Skill Score: ${avgScore.toFixed(1)}/10`);
}

generateProgressReport().catch(console.error);
```

### Batch Code Review

```typescript
import { createProvider, findAllTodos, extractTodoCode, reviewCodeWithAI } from 'codetandem';
import { readdir } from 'fs/promises';
import { join } from 'path';

async function batchReview(directory: string) {
  const provider = await createProvider({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY!
  });
  
  const files = await readdir(directory);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  
  for (const file of jsFiles) {
    const filePath = join(directory, file);
    const todos = await findAllTodos(filePath);
    
    console.log(`\n${file}: Found ${todos.length} TODOs`);
    
    for (const [lineNum, todoText] of todos) {
      console.log(`  Line ${lineNum}: ${todoText}`);
      
      const extraction = await extractTodoCode(filePath, todoText);
      if (extraction) {
        const review = await reviewCodeWithAI(provider, extraction);
        console.log(`    Result: ${review.success ? 'Pass' : 'Needs work'}`);
        console.log(`    ${review.feedback.substring(0, 100)}...`);
      }
    }
  }
}

batchReview('./src').catch(console.error);
```

## TypeScript Support

CodeTandem is written in TypeScript and provides full type definitions. All types are exported from the main module:

```typescript
import type {
  StateData,
  Module,
  AIContext,
  AIResponse,
  CodeExtraction,
  ReviewResult,
  ProviderConfig,
  ChatMessage
} from 'codetandem';
```

## Error Handling

All async functions may throw errors. Recommended error handling:

```typescript
import { loadState } from 'codetandem';

try {
  const state = await loadState('./codetandem.state.json');
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      console.error('State file not found. Run `codetandem init` first.');
    } else {
      console.error('Failed to load state:', error.message);
    }
  }
}
```

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/reubenwestrop/code-tandem/issues
- Documentation: https://github.com/reubenwestrop/code-tandem
