import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  generateInitialState,
  loadState,
  updateState,
  getCurrentModuleId,
  getSkillScore,
  isModuleCompleted,
  getHintCount,
  incrementSkillScore,
} from './state.js';

describe('State Management', () => {
  let tempDir: string;
  let statePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'codetandem-test-'));
    statePath = join(tempDir, 'codetandem.state.json');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('generateInitialState', () => {
    it('should create initial state file', async () => {
      const state = await generateInitialState({
        modulesPath: '/fake/modules.json',
        projectPath: '/fake/project',
        outputPath: statePath,
        firstModuleId: 'module-1',
        totalModules: 5,
      });

      expect(state.version).toBe('1.0');
      expect(state.currentModuleId).toBe('module-1');
      expect(state.skillScores['module-1']).toBe(0.0);
      expect(state.completedModules).toEqual([]);
      expect(state.createdAt).toBeDefined();
      expect(state.updatedAt).toBeDefined();
    });

    it('should create state with custom initial skill score', async () => {
      const state = await generateInitialState({
        modulesPath: '/fake/modules.json',
        projectPath: '/fake/project',
        outputPath: statePath,
        firstModuleId: 'module-1',
        totalModules: 5,
        initialSkillScore: 5.0,
      });

      expect(state.skillScores['module-1']).toBe(5.0);
    });

    it('should include metadata', async () => {
      const state = await generateInitialState({
        modulesPath: '/fake/modules.json',
        projectPath: '/fake/project',
        outputPath: statePath,
        firstModuleId: 'module-1',
        totalModules: 5,
      });

      expect(state.metadata?.totalModules).toBe(5);
      expect(state.metadata?.projectPath).toBe('/fake/project');
    });
  });

  describe('loadState', () => {
    it('should load existing state file', async () => {
      await generateInitialState({
        modulesPath: '/fake/modules.json',
        projectPath: '/fake/project',
        outputPath: statePath,
        firstModuleId: 'module-1',
        totalModules: 5,
      });

      const state = await loadState(statePath);
      expect(state.currentModuleId).toBe('module-1');
    });

    it('should throw error for missing file', async () => {
      await expect(loadState('/nonexistent/state.json')).rejects.toThrow('State file not found');
    });

    it('should validate required fields', async () => {
      // Write invalid state
      await generateInitialState({
        modulesPath: '/fake/modules.json',
        projectPath: '/fake/project',
        outputPath: statePath,
        firstModuleId: 'module-1',
        totalModules: 5,
      });

      // Corrupt the file
      const content = await readFile(statePath, 'utf-8');
      const data = JSON.parse(content);
      delete data.currentModuleId;
      await require('fs/promises').writeFile(statePath, JSON.stringify(data));

      await expect(loadState(statePath)).rejects.toThrow(
        "Invalid state.json: missing 'currentModuleId' field"
      );
    });
  });

  describe('updateState', () => {
    beforeEach(async () => {
      await generateInitialState({
        modulesPath: '/fake/modules.json',
        projectPath: '/fake/project',
        outputPath: statePath,
        firstModuleId: 'module-1',
        totalModules: 5,
      });
    });

    it('should update current module ID', async () => {
      const updated = await updateState(statePath, {
        currentModuleId: 'module-2',
      });

      expect(updated.currentModuleId).toBe('module-2');
    });

    it('should update skill score', async () => {
      const updated = await updateState(statePath, {
        skillScore: 7.5,
      });

      expect(updated.skillScores['module-1']).toBe(7.5);
    });

    it('should mark module as completed', async () => {
      const updated = await updateState(statePath, {
        completedModuleId: 'module-1',
      });

      expect(updated.completedModules).toContain('module-1');
    });

    it('should not duplicate completed modules', async () => {
      await updateState(statePath, { completedModuleId: 'module-1' });
      const updated = await updateState(statePath, { completedModuleId: 'module-1' });

      expect(updated.completedModules.filter((id) => id === 'module-1')).toHaveLength(1);
    });

    it('should update hint count', async () => {
      const updated = await updateState(statePath, {
        hintCount: 3,
      });

      expect(updated.hints?.['module-1']).toBe(3);
    });

    it('should update difficulty override', async () => {
      const updated = await updateState(statePath, {
        difficultyOverride: 'hard',
      });

      expect(updated.difficultyOverride).toBe('hard');
    });
  });

  describe('Helper Functions', () => {
    let state: Awaited<ReturnType<typeof generateInitialState>>;

    beforeEach(async () => {
      state = await generateInitialState({
        modulesPath: '/fake/modules.json',
        projectPath: '/fake/project',
        outputPath: statePath,
        firstModuleId: 'module-1',
        totalModules: 5,
      });
    });

    it('getCurrentModuleId should return current module', () => {
      expect(getCurrentModuleId(state)).toBe('module-1');
    });

    it('getSkillScore should return skill score', () => {
      state.skillScores['module-2'] = 8.5;
      expect(getSkillScore(state, 'module-2')).toBe(8.5);
    });

    it('getSkillScore should return 0 for unknown module', () => {
      expect(getSkillScore(state, 'unknown')).toBe(0.0);
    });

    it('isModuleCompleted should check completion', () => {
      state.completedModules = ['module-1'];
      expect(isModuleCompleted(state, 'module-1')).toBe(true);
      expect(isModuleCompleted(state, 'module-2')).toBe(false);
    });

    it('getHintCount should return hint count', () => {
      state.hints = { 'module-1': 5 };
      expect(getHintCount(state, 'module-1')).toBe(5);
    });

    it('getHintCount should return 0 for unknown module', () => {
      expect(getHintCount(state, 'unknown')).toBe(0);
    });
  });

  describe('incrementSkillScore', () => {
    beforeEach(async () => {
      await generateInitialState({
        modulesPath: '/fake/modules.json',
        projectPath: '/fake/project',
        outputPath: statePath,
        firstModuleId: 'module-1',
        totalModules: 5,
        initialSkillScore: 5.0,
      });
    });

    it('should increment skill score', async () => {
      const newScore = await incrementSkillScore(statePath, 'module-1', 2.5);
      expect(newScore).toBe(7.5);

      const state = await loadState(statePath);
      expect(state.skillScores['module-1']).toBe(7.5);
    });

    it('should handle new modules', async () => {
      const newScore = await incrementSkillScore(statePath, 'module-2', 3.0);
      expect(newScore).toBe(3.0);
    });
  });
});
