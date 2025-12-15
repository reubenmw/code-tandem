/**
 * Code parser for extracting user-written code from source files
 */

import { readFile } from 'fs/promises';

export interface CodeExtraction {
  filePath: string;
  todoLine: number;
  todoText: string;
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

    // Find all TODO comments
    const todoPattern = /\/\/\s*TODO:?\s*(.+)/i;
    const todos: [number, string][] = [];

    lines.forEach((line, index) => {
      const match = line.match(todoPattern);
      if (match) {
        todos.push([index + 1, match[1]!.trim()]);
      }
    });

    if (todos.length === 0) return null;

    // Select target TODO
    let targetTodo: [number, string] | undefined;
    if (todoText) {
      targetTodo = todos.find(([, text]) => text.toLowerCase().includes(todoText.toLowerCase()));
    } else {
      targetTodo = todos[todoIndex === -1 ? todos.length - 1 : todoIndex];
    }

    if (!targetTodo) return null;

    const [todoLine, todoContent] = targetTodo;

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
      code: codeLines.join('\n'),
      startLine: todoLine + 1,
      endLine: todoLine + codeLines.length,
    };
  } catch {
    return null;
  }
}

export async function findAllTodos(filePath: string): Promise<[number, string][]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const todoPattern = /\/\/\s*TODO:?\s*(.+)/i;
    const todos: [number, string][] = [];

    lines.forEach((line, index) => {
      const match = line.match(todoPattern);
      if (match) {
        todos.push([index + 1, match[1]!.trim()]);
      }
    });

    return todos;
  } catch {
    return [];
  }
}
