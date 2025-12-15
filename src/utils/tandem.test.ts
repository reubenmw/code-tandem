import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  loadProjectContext,
  getNextObjectiveIndex,
  formatModuleInfo,
  buildCodingPrompt,
  parseCodeModification,
  generateCodeWithAI,
  applyCodeModification,
} from './tandem.js';
import type { ProjectContext } from './tandem.js';
import { BaseAIProvider } from '../providers/base.js';

describe('tandem', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'tandem-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('loadProjectContext', () => {
    it('should load project context successfully', async () => {
      // Create modules.json
      const modules = [{ id: 'intro', title: 'Introduction', objectives: ['Learn basics'] }];
      await writeFile(join(tempDir, 'modules.json'), JSON.stringify(modules));

      // Create state file
      const state = {
        currentModuleId: 'intro',
        fileTree: {},
        modules: {},
        skillScores: {},
        completedModules: [],
      };
      await writeFile(join(tempDir, 'codetandem.state.json'), JSON.stringify(state));

      const context = await loadProjectContext(tempDir);

      expect(context.currentModule.id).toBe('intro');
      expect(context.modules).toHaveLength(1);
      expect(context.projectPath).toBe(tempDir);
    });

    it('should throw error if modules not found', async () => {
      await expect(loadProjectContext(tempDir)).rejects.toThrow();
    });
  });

  describe('getNextObjectiveIndex', () => {
    it('should return 0 if objectives exist', () => {
      const context: ProjectContext = {
        state: { currentModuleId: 'test', fileTree: {}, modules: {}, skillScores: {} },
        modules: [{ id: 'test', title: 'Test', objectives: ['A', 'B'] }],
        currentModule: { id: 'test', title: 'Test', objectives: ['A', 'B'] },
        projectPath: '/test',
      };

      expect(getNextObjectiveIndex(context)).toBe(0);
    });

    it('should return null if no objectives', () => {
      const context: ProjectContext = {
        state: { currentModuleId: 'test', fileTree: {}, modules: {}, skillScores: {} },
        modules: [{ id: 'test', title: 'Test', objectives: [] }],
        currentModule: { id: 'test', title: 'Test', objectives: [] },
        projectPath: '/test',
      };

      expect(getNextObjectiveIndex(context)).toBeNull();
    });
  });

  describe('formatModuleInfo', () => {
    it('should format module information', () => {
      const context: ProjectContext = {
        state: { currentModuleId: 'intro', fileTree: {}, modules: {}, skillScores: {} },
        modules: [],
        currentModule: {
          id: 'intro',
          title: 'Introduction',
          objectives: ['Learn basics', 'Practice'],
        },
        projectPath: '/test',
      };

      const formatted = formatModuleInfo(context);

      expect(formatted).toContain('Module: Introduction');
      expect(formatted).toContain('ID: intro');
      expect(formatted).toContain('1. Learn basics');
      expect(formatted).toContain('2. Practice');
    });
  });

  describe('buildCodingPrompt', () => {
    const context: ProjectContext = {
      state: { currentModuleId: 'intro', fileTree: {}, modules: {}, skillScores: {} },
      modules: [],
      currentModule: {
        id: 'intro',
        title: 'Introduction',
        objectives: ['Learn functions', 'Practice loops'],
      },
      projectPath: '/test',
    };

    it('should build basic coding prompt', () => {
      const prompt = buildCodingPrompt(context);

      expect(prompt).toContain('CodeTandem');
      expect(prompt).toContain('Module: Introduction');
      expect(prompt).toContain('Learn functions');
    });

    it('should include beginner scaffolding for low skill level', () => {
      const prompt = buildCodingPrompt(context, undefined, undefined, 0, 2.0);

      expect(prompt).toContain('BEGINNER');
      expect(prompt).toContain('DETAILED scaffolding');
      expect(prompt).toContain('step-by-step hints');
    });

    it('should include intermediate scaffolding for medium skill level', () => {
      const prompt = buildCodingPrompt(context, undefined, undefined, 0, 5.0);

      expect(prompt).toContain('INTERMEDIATE');
      expect(prompt).toContain('GOAL-ORIENTED scaffolding');
    });

    it('should include advanced scaffolding for high skill level', () => {
      const prompt = buildCodingPrompt(context, undefined, undefined, 0, 8.0);

      expect(prompt).toContain('ADVANCED');
      expect(prompt).toContain('CONCEPTUAL scaffolding');
    });

    it('should include target file information', () => {
      const prompt = buildCodingPrompt(context, 'main.js', 'console.log("hi");');

      expect(prompt).toContain('File: main.js');
      expect(prompt).toContain('console.log("hi");');
    });
  });

  describe('parseCodeModification', () => {
    it('should parse valid code modification', () => {
      const response = JSON.stringify({
        file_path: 'test.js',
        code: 'function test() {}',
        todo_line: 5,
        todo_task: 'Implement test',
        explanation: 'Created function skeleton',
      });

      const mod = parseCodeModification(response);

      expect(mod.filePath).toBe('test.js');
      expect(mod.code).toBe('function test() {}');
      expect(mod.todoLine).toBe(5);
      expect(mod.todoTask).toBe('Implement test');
      expect(mod.explanation).toBe('Created function skeleton');
    });

    it('should handle JSON wrapped in markdown', () => {
      const response =
        '```json\n{"file_path": "test.js", "code": "x", "todo_line": 1, "todo_task": "t", "explanation": "e"}\n```';

      const mod = parseCodeModification(response);

      expect(mod.filePath).toBe('test.js');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => parseCodeModification('not json')).toThrow('Invalid JSON');
    });

    it('should throw error for missing required fields', () => {
      const response = JSON.stringify({
        file_path: 'test.js',
        // missing other fields
      });

      expect(() => parseCodeModification(response)).toThrow('Missing required fields');
    });
  });

  describe('generateCodeWithAI', () => {
    it('should generate code using AI provider', async () => {
      const context: ProjectContext = {
        state: { currentModuleId: 'intro', fileTree: {}, modules: {}, skillScores: {} },
        modules: [],
        currentModule: {
          id: 'intro',
          title: 'Introduction',
          objectives: ['Learn functions'],
        },
        projectPath: '/test',
      };

      const mockProvider = {
        generateCodeSuggestion: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            file_path: 'test.js',
            code: 'function test() {}',
            todo_line: 1,
            todo_task: 'Implement',
            explanation: 'Created',
          }),
          model: 'test-model',
        }),
      } as unknown as BaseAIProvider;

      const mod = await generateCodeWithAI(mockProvider, context);

      expect(mockProvider.generateCodeSuggestion).toHaveBeenCalled();
      expect(mod.filePath).toBe('test.js');
    });
  });

  describe('applyCodeModification', () => {
    it('should write file to project', async () => {
      const mod = {
        filePath: 'src/test.js',
        code: 'console.log("test");',
        todoLine: 1,
        todoTask: 'Test',
        explanation: 'Test file',
      };

      const filePath = await applyCodeModification(mod, tempDir);

      expect(filePath).toContain('src/test.js');

      // Verify file exists
      const { readFile } = await import('fs/promises');
      const content = await readFile(filePath, 'utf-8');
      expect(content).toBe('console.log("test");');
    });

    it('should not write file in dry run mode', async () => {
      const mod = {
        filePath: 'test.js',
        code: 'test',
        todoLine: 1,
        todoTask: 'Test',
        explanation: 'Test',
      };

      const filePath = await applyCodeModification(mod, tempDir, true);

      expect(filePath).toContain('test.js');

      // Verify file was NOT created
      const { access } = await import('fs/promises');
      await expect(access(filePath)).rejects.toThrow();
    });
  });
});
