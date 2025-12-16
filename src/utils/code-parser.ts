/**
 * Code parser for extracting user-written code from source files
 */

import { readFile } from 'fs/promises';
import { createTodoPattern, createSuccessCriteriaPattern, isCommentLine } from './language.js';

export interface CodeExtraction {
  filePath: string;
  todoLine: number;
  todoText: string;
  todoId?: string; // Extracted from TODO: [id] format
  successCriteria?: string[]; // Extracted from SUCCESS CRITERIA comments
  code: string;
  startLine: number;
  endLine: number;
}

export async function extractTodoCode(
  filePath: string,
  todoText?: string,
  todoIndex: number = -1
): Promise<CodeExtraction | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    // Find all TODO comments with optional ID
    // Supports multiple languages: // TODO: [obj-1] Description (JS/TS)
    //                               # TODO: [obj-1] Description (Python)
    //                               -- TODO: [obj-1] Description (SQL/Lua)
    const todoPattern = createTodoPattern();
    const todos: [number, string, string | undefined][] = [];

    lines.forEach((line, index) => {
      const match = line.match(todoPattern);
      if (match) {
        // match[1] is comment syntax (// or # or --)
        // match[2] is todoId
        // match[3] is todoText
        const todoId = match[2]?.trim();
        const todoText = match[3]?.trim() || '';
        todos.push([index + 1, todoText, todoId]);
      }
    });

    if (todos.length === 0) return null;

    // Select target TODO
    let targetTodo: [number, string, string | undefined] | undefined;
    if (todoText) {
      targetTodo = todos.find(([, text]) => text.toLowerCase().includes(todoText.toLowerCase()));
    } else {
      targetTodo = todos[todoIndex === -1 ? todos.length - 1 : todoIndex];
    }

    if (!targetTodo) return null;

    const [todoLine, todoContent, todoId] = targetTodo;

    // Extract success criteria from comments above TODO
    const successCriteria: string[] = [];
    if (todoId) {
      // Look for SUCCESS CRITERIA comments above the TODO (supports any comment syntax)
      const criteriaPattern = createSuccessCriteriaPattern(todoId);
      let criteriaStartLine = -1;

      for (let i = todoLine - 2; i >= 0; i--) {
        const line = lines[i] || '';
        if (criteriaPattern.test(line)) {
          criteriaStartLine = i;
          break;
        }
        // Stop if we hit non-comment or empty line
        if (!isCommentLine(line) && line.trim() !== '') {
          break;
        }
      }

      // Extract criteria lines (supports any comment syntax)
      if (criteriaStartLine >= 0) {
        for (let i = criteriaStartLine + 1; i < todoLine; i++) {
          const line = lines[i]?.trim() || '';
          if (isCommentLine(line)) {
            // Remove leading comment syntax and whitespace, and optional - prefix
            const criterion = line.replace(/^(\/\/|#|--|;)\s*-?\s*/, '').trim();
            if (criterion && !criterion.includes('TODO:')) {
              successCriteria.push(criterion);
            }
          }
        }
      }
    }

    // Find code after TODO
    const nextTodoLine = todos.find(([line]) => line > todoLine)?.[0];
    const endLine = nextTodoLine ? nextTodoLine - 1 : lines.length;

    // Extract code (skip TODO line)
    const codeLines = lines.slice(todoLine, endLine);

    // Trim trailing empty lines
    while (codeLines.length && !codeLines[codeLines.length - 1]?.trim()) {
      codeLines.pop();
    }

    return {
      filePath,
      todoLine,
      todoText: todoContent,
      todoId,
      successCriteria: successCriteria.length > 0 ? successCriteria : undefined,
      code: codeLines.join('\n'),
      startLine: todoLine + 1,
      endLine: todoLine + codeLines.length,
    };
  } catch {
    return null;
  }
}

export interface TodoInfo {
  line: number;
  text: string;
  id?: string;
}

export async function findAllTodos(filePath: string): Promise<TodoInfo[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    // Supports multiple languages: // TODO: [obj-1] Description (JS/TS)
    //                               # TODO: [obj-1] Description (Python/Ruby)
    //                               -- TODO: [obj-1] Description (SQL/Lua)
    const todoPattern = createTodoPattern();
    const todos: TodoInfo[] = [];

    lines.forEach((line, index) => {
      const match = line.match(todoPattern);
      if (match) {
        // match[1] is comment syntax (// or # or --)
        // match[2] is todoId
        // match[3] is todoText
        const todoId = match[2]?.trim();
        const todoText = match[3]?.trim() || '';
        todos.push({
          line: index + 1,
          text: todoText,
          id: todoId,
        });
      }
    });

    return todos;
  } catch {
    return [];
  }
}
