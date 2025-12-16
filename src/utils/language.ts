/**
 * Language detection and comment syntax utilities
 */

export interface LanguageInfo {
  name: string;
  commentSyntax: string;
  extensions: string[];
}

const LANGUAGE_MAP: Record<string, LanguageInfo> = {
  // JavaScript/TypeScript
  js: { name: 'JavaScript', commentSyntax: '//', extensions: ['.js', '.jsx', '.mjs', '.cjs'] },
  ts: { name: 'TypeScript', commentSyntax: '//', extensions: ['.ts', '.tsx'] },

  // Python
  python: { name: 'Python', commentSyntax: '#', extensions: ['.py', '.pyw'] },

  // Ruby
  ruby: { name: 'Ruby', commentSyntax: '#', extensions: ['.rb'] },

  // Shell/Bash
  shell: { name: 'Shell', commentSyntax: '#', extensions: ['.sh', '.bash', '.zsh'] },

  // Go
  go: { name: 'Go', commentSyntax: '//', extensions: ['.go'] },

  // Rust
  rust: { name: 'Rust', commentSyntax: '//', extensions: ['.rs'] },

  // Java
  java: { name: 'Java', commentSyntax: '//', extensions: ['.java'] },

  // C/C++
  c: { name: 'C', commentSyntax: '//', extensions: ['.c', '.h'] },
  cpp: { name: 'C++', commentSyntax: '//', extensions: ['.cpp', '.hpp', '.cc', '.cxx'] },

  // C#
  csharp: { name: 'C#', commentSyntax: '//', extensions: ['.cs'] },

  // PHP
  php: { name: 'PHP', commentSyntax: '//', extensions: ['.php'] },

  // Swift
  swift: { name: 'Swift', commentSyntax: '//', extensions: ['.swift'] },

  // Kotlin
  kotlin: { name: 'Kotlin', commentSyntax: '//', extensions: ['.kt', '.kts'] },

  // Dart
  dart: { name: 'Dart', commentSyntax: '//', extensions: ['.dart'] },

  // R
  r: { name: 'R', commentSyntax: '#', extensions: ['.r', '.R'] },

  // Perl
  perl: { name: 'Perl', commentSyntax: '#', extensions: ['.pl', '.pm'] },

  // YAML
  yaml: { name: 'YAML', commentSyntax: '#', extensions: ['.yaml', '.yml'] },

  // SQL
  sql: { name: 'SQL', commentSyntax: '--', extensions: ['.sql'] },

  // Lua
  lua: { name: 'Lua', commentSyntax: '--', extensions: ['.lua'] },

  // Haskell
  haskell: { name: 'Haskell', commentSyntax: '--', extensions: ['.hs'] },

  // Elixir
  elixir: { name: 'Elixir', commentSyntax: '#', extensions: ['.ex', '.exs'] },

  // Scala
  scala: { name: 'Scala', commentSyntax: '//', extensions: ['.scala'] },

  // Clojure
  clojure: { name: 'Clojure', commentSyntax: ';', extensions: ['.clj', '.cljs', '.cljc'] },

  // Lisp
  lisp: { name: 'Lisp', commentSyntax: ';', extensions: ['.lisp', '.lsp'] },
};

/**
 * Detect language from file path or extension
 */
export function detectLanguage(filePath: string): LanguageInfo {
  const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();

  // Find language by extension
  for (const lang of Object.values(LANGUAGE_MAP)) {
    if (lang.extensions.includes(extension)) {
      return lang;
    }
  }

  // Default to JavaScript style comments
  return { name: 'Unknown', commentSyntax: '//', extensions: [extension] };
}

/**
 * Get comment syntax for a file
 */
export function getCommentSyntax(filePath: string): string {
  return detectLanguage(filePath).commentSyntax;
}

/**
 * Format a TODO comment for a specific language
 */
export function formatTodoComment(filePath: string, todoId: string, task: string): string {
  const commentSyntax = getCommentSyntax(filePath);
  return `${commentSyntax} TODO: [${todoId}] ${task}`;
}

/**
 * Format success criteria comments for a specific language
 */
export function formatSuccessCriteria(
  filePath: string,
  todoId: string,
  criteria: string[]
): string[] {
  const commentSyntax = getCommentSyntax(filePath);
  const lines: string[] = [];

  lines.push(`${commentSyntax} SUCCESS CRITERIA for [${todoId}]:`);
  for (const criterion of criteria) {
    lines.push(`${commentSyntax} - ${criterion}`);
  }

  return lines;
}

/**
 * Get all comment syntax patterns for parsing
 */
export function getAllCommentPatterns(): string[] {
  const patterns = new Set<string>();
  for (const lang of Object.values(LANGUAGE_MAP)) {
    patterns.add(lang.commentSyntax);
  }
  return Array.from(patterns);
}

/**
 * Create regex pattern to match TODO comments in any language
 */
export function createTodoPattern(): RegExp {
  // Matches: // TODO: [obj-1] task OR # TODO: [obj-1] task OR -- TODO: [obj-1] task, etc.
  return /^[\s]*(\/\/|#|--|;)\s*TODO:?\s*(?:\[([^\]]+)\])?\s*(.+)/i;
}

/**
 * Create regex pattern to match SUCCESS CRITERIA comments in any language
 */
export function createSuccessCriteriaPattern(todoId: string): RegExp {
  // Matches: // SUCCESS CRITERIA for [obj-1]: OR # SUCCESS CRITERIA for [obj-1]:
  return new RegExp(
    `^[\\s]*(//|#|--|;)\\s*SUCCESS CRITERIA for \\[${todoId}\\]:?`,
    'i'
  );
}

/**
 * Check if a line is a comment in any supported language
 */
export function isCommentLine(line: string): boolean {
  const trimmed = line.trim();
  const patterns = getAllCommentPatterns();
  return patterns.some((pattern) => trimmed.startsWith(pattern));
}
