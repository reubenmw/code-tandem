import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { generateModulesJson, loadModules, getModuleById } from './modules.js';

describe('modules', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'modules-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('generateModulesJson', () => {
    it('should generate modules.json from curriculum', async () => {
      const curriculumPath = join(tempDir, 'curriculum.md');
      const outputPath = join(tempDir, 'modules.json');

      await writeFile(curriculumPath, `
# Module One

- Objective 1
- Objective 2

# Module Two

- Objective A
      `);

      const modules = await generateModulesJson(curriculumPath, outputPath);

      expect(modules).toHaveLength(2);
      expect(modules[0].id).toBe('module-one');
      expect(modules[1].id).toBe('module-two');

      // Verify file was written
      const loaded = await loadModules(outputPath);
      expect(loaded).toEqual(modules);
    });
  });

  describe('loadModules', () => {
    it('should load valid modules.json', async () => {
      const modulesPath = join(tempDir, 'modules.json');
      const modulesData = [
        {
          id: 'test-module',
          title: 'Test Module',
          objectives: ['Objective 1', 'Objective 2']
        }
      ];

      await writeFile(modulesPath, JSON.stringify(modulesData));

      const modules = await loadModules(modulesPath);

      expect(modules).toHaveLength(1);
      expect(modules[0].id).toBe('test-module');
      expect(modules[0].objectives).toHaveLength(2);
    });

    it('should throw error if modules.json is not an array', async () => {
      const modulesPath = join(tempDir, 'modules.json');
      await writeFile(modulesPath, '{"not": "an array"}');

      await expect(loadModules(modulesPath)).rejects.toThrow('must contain an array');
    });

    it('should throw error if module structure is invalid', async () => {
      const modulesPath = join(tempDir, 'modules.json');
      await writeFile(modulesPath, '[{"id": "test"}]'); // missing title and objectives

      await expect(loadModules(modulesPath)).rejects.toThrow('Invalid module structure');
    });
  });

  describe('getModuleById', () => {
    const modules = [
      { id: 'mod-1', title: 'Module 1', objectives: ['A'] },
      { id: 'mod-2', title: 'Module 2', objectives: ['B'] },
      { id: 'mod-3', title: 'Module 3', objectives: ['C'] }
    ];

    it('should find module by ID', () => {
      const module = getModuleById(modules, 'mod-2');
      expect(module.id).toBe('mod-2');
      expect(module.title).toBe('Module 2');
    });

    it('should throw error if module not found', () => {
      expect(() => getModuleById(modules, 'nonexistent')).toThrow('Module not found: nonexistent');
    });
  });
});
