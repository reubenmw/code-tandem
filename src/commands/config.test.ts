import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { configCommand } from './config.js';
import { ConfigManager } from '../utils/config.js';

describe('config command', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'config-cmd-test-'));
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('set subcommand', () => {
    it('should set provider configuration', async () => {
      const manager = new ConfigManager(tempDir);

      await manager.setProvider('anthropic');

      const provider = await manager.getProvider();
      expect(provider).toBe('anthropic');
    });

    it('should set model configuration', async () => {
      const manager = new ConfigManager(tempDir);

      await manager.setModel('claude-3-opus-20240229');

      const model = await manager.getModel();
      expect(model).toBe('claude-3-opus-20240229');
    });
  });

  describe('get subcommand', () => {
    it('should get specific configuration value', async () => {
      const manager = new ConfigManager(tempDir);

      await manager.setProvider('openai');

      const value = await manager.getConfigValue('provider');
      expect(value).toBe('openai');
    });

    it('should return undefined for non-existent key', async () => {
      const manager = new ConfigManager(tempDir);

      const value = await manager.getConfigValue('nonexistent');
      expect(value).toBeUndefined();
    });
  });

  describe('show subcommand', () => {
    it('should show all configuration', async () => {
      const manager = new ConfigManager(tempDir);

      await manager.setProvider('gemini');
      await manager.setModel('gemini-pro');

      const config = await manager.getAll();
      expect(config.provider).toBe('gemini');
      expect(config.model).toBe('gemini-pro');
    });
  });

  describe('configuration persistence', () => {
    it('should persist configuration across instances', async () => {
      const manager1 = new ConfigManager(tempDir);
      await manager1.setProvider('openai');
      await manager1.setModel('gpt-4');

      // Create new instance
      const manager2 = new ConfigManager(tempDir);
      const config = await manager2.getAll();

      expect(config.provider).toBe('openai');
      expect(config.model).toBe('gpt-4');
    });
  });

  describe('validation', () => {
    it('should validate provider names', async () => {
      const manager = new ConfigManager(tempDir);

      // Valid providers should work
      await expect(manager.setProvider('openai')).resolves.not.toThrow();
      await expect(manager.setProvider('anthropic')).resolves.not.toThrow();
      await expect(manager.setProvider('gemini')).resolves.not.toThrow();
    });

    it('should handle empty configuration gracefully', async () => {
      const manager = new ConfigManager(tempDir);

      const config = await manager.getAll();
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });
  });
});
