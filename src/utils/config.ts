/**
 * Configuration management using cosmiconfig
 */

import { cosmiconfig } from 'cosmiconfig';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

export interface CodeTandemConfig {
  provider?: string;
  model?: string;
  [key: string]: unknown;
}

const MODULE_NAME = 'codetandem';

/**
 * Configuration Manager class
 */
export class ConfigManager {
  private configDir: string;
  private configFile: string;
  private explorer: ReturnType<typeof cosmiconfig>;

  constructor(configDir?: string) {
    if (!configDir) {
      configDir = join(homedir(), '.config', MODULE_NAME);
    }

    this.configDir = configDir;
    this.configFile = join(configDir, 'config.json');
    this.explorer = cosmiconfig(MODULE_NAME, {
      searchPlaces: [
        'package.json',
        `.${MODULE_NAME}rc`,
        `.${MODULE_NAME}rc.json`,
        `.${MODULE_NAME}rc.js`,
        `${MODULE_NAME}.config.js`,
        this.configFile,
      ],
    });
  }

  /**
   * Ensure config directory exists
   */
  private async ensureConfigDir(): Promise<void> {
    await mkdir(this.configDir, { recursive: true });
  }

  /**
   * Load configuration from file
   */
  private async loadConfig(): Promise<CodeTandemConfig> {
    try {
      // Try to load from the specific config file first
      const result = await this.explorer.load(this.configFile);
      return (result?.config as CodeTandemConfig) || {};
    } catch {
      return {};
    }
  }

  /**
   * Save configuration to file
   */
  private async saveConfig(config: CodeTandemConfig): Promise<void> {
    await this.ensureConfigDir();
    await writeFile(this.configFile, JSON.stringify(config, null, 2), 'utf-8');
    // Clear the cache after saving
    this.explorer.clearCaches();
  }

  /**
   * Get a configuration value
   */
  async getConfigValue(key: string): Promise<unknown> {
    const config = await this.loadConfig();
    return config[key];
  }

  /**
   * Set a configuration value
   */
  async setConfigValue(key: string, value: unknown): Promise<void> {
    const config = await this.loadConfig();
    config[key] = value;
    await this.saveConfig(config);
  }

  /**
   * Get the configured AI provider
   */
  async getProvider(): Promise<string | undefined> {
    return (await this.getConfigValue('provider')) as string | undefined;
  }

  /**
   * Set the AI provider
   */
  async setProvider(provider: string): Promise<void> {
    await this.setConfigValue('provider', provider);
  }

  /**
   * Get the configured model name
   */
  async getModel(): Promise<string | undefined> {
    return (await this.getConfigValue('model')) as string | undefined;
  }

  /**
   * Set the model name
   */
  async setModel(model: string): Promise<void> {
    await this.setConfigValue('model', model);
  }

  /**
   * Get all configuration
   */
  async getAll(): Promise<CodeTandemConfig> {
    return await this.loadConfig();
  }
}

// Global instance
let configManager: ConfigManager | null = null;

/**
 * Get the global configuration manager instance
 */
export function getConfigManager(configDir?: string): ConfigManager {
  if (!configManager) {
    configManager = new ConfigManager(configDir);
  }
  return configManager;
}
