import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { ConfigManager } from './config.js';

describe('Configuration Management', () => {
  let tempDir: string;
  let configManager: ConfigManager;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'codetandem-config-test-'));
    configManager = new ConfigManager(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('ConfigManager', () => {
    it('should set and get provider', async () => {
      await configManager.setProvider('openai');
      const provider = await configManager.getProvider();
      expect(provider).toBe('openai');
    });

    it('should set and get model', async () => {
      await configManager.setModel('gpt-4');
      const model = await configManager.getModel();
      expect(model).toBe('gpt-4');
    });

    it('should set and get custom config values', async () => {
      await configManager.setConfigValue('customKey', 'customValue');
      const value = await configManager.getConfigValue('customKey');
      expect(value).toBe('customValue');
    });

    it('should return undefined for non-existent keys', async () => {
      const value = await configManager.getConfigValue('nonExistent');
      expect(value).toBeUndefined();
    });

    it('should persist configuration across instances', async () => {
      await configManager.setProvider('anthropic');
      await configManager.setModel('claude-3-opus-20240229');

      // Create new instance
      const newManager = new ConfigManager(tempDir);
      const provider = await newManager.getProvider();
      const model = await newManager.getModel();

      expect(provider).toBe('anthropic');
      expect(model).toBe('claude-3-opus-20240229');
    });

    it('should get all configuration', async () => {
      await configManager.setProvider('gemini');
      await configManager.setModel('gemini-pro');
      await configManager.setConfigValue('temperature', 0.7);

      const config = await configManager.getAll();
      expect(config.provider).toBe('gemini');
      expect(config.model).toBe('gemini-pro');
      expect(config.temperature).toBe(0.7);
    });

    it('should handle empty configuration', async () => {
      const provider = await configManager.getProvider();
      const model = await configManager.getModel();

      expect(provider).toBeUndefined();
      expect(model).toBeUndefined();
    });

    it('should overwrite existing values', async () => {
      await configManager.setProvider('openai');
      await configManager.setProvider('anthropic');

      const provider = await configManager.getProvider();
      expect(provider).toBe('anthropic');
    });
  });
});
