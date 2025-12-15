/**
 * Configuration management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getConfigManager } from '../utils/config.js';
import { getApiKey, setApiKey, deleteApiKey } from '../utils/secrets.js';

export const configCommand = new Command('config')
  .description('Manage CodeTandem configuration')
  .addCommand(createSetCommand())
  .addCommand(createGetCommand())
  .addCommand(createShowCommand())
  .addCommand(createClearCommand());

/**
 * config set command
 */
function createSetCommand(): Command {
  return new Command('set')
    .description('Set a configuration value')
    .argument('<key>', 'Configuration key (provider, model, api_key)')
    .argument('<value>', 'Configuration value')
    .action(async (key: string, value: string) => {
      try {
        const configManager = getConfigManager();

        if (key === 'api_key') {
          // Get the current provider to store the API key for
          const provider = await configManager.getProvider();
          if (!provider) {
            console.log(
              chalk.red('Error:') +
                ' No provider set. Please set a provider first with: ' +
                chalk.cyan('codetandem config set provider <name>')
            );
            process.exit(1);
          }

          await setApiKey(provider, value);
          console.log(chalk.green('✓') + ` API key securely stored for provider: ${provider}`);
        } else if (key === 'provider') {
          await configManager.setProvider(value);
          console.log(chalk.green('✓') + ` Provider set to: ${value}`);
        } else if (key === 'model') {
          await configManager.setModel(value);
          console.log(chalk.green('✓') + ` Model set to: ${value}`);
        } else {
          // Generic config value
          await configManager.setConfigValue(key, value);
          console.log(chalk.green('✓') + ` ${key} set to: ${value}`);
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

/**
 * config get command
 */
function createGetCommand(): Command {
  return new Command('get')
    .description('Get a configuration value')
    .argument('<key>', 'Configuration key (provider, model, api_key)')
    .action(async (key: string) => {
      try {
        const configManager = getConfigManager();

        if (key === 'api_key') {
          const provider = await configManager.getProvider();
          if (!provider) {
            console.log(chalk.red('Error:') + ' No provider set.');
            process.exit(1);
          }

          const apiKey = await getApiKey(provider);
          if (apiKey) {
            // Show only first few characters for security
            const maskedKey = apiKey.length > 8 ? apiKey.slice(0, 8) + '...' : '***';
            console.log(`API key for ${provider}: ${maskedKey}`);
          } else {
            console.log(chalk.yellow(`No API key set for provider: ${provider}`));
          }
        } else if (key === 'provider') {
          const value = await configManager.getProvider();
          if (value) {
            console.log(`Provider: ${value}`);
          } else {
            console.log(chalk.yellow('No provider set'));
          }
        } else if (key === 'model') {
          const value = await configManager.getModel();
          if (value) {
            console.log(`Model: ${value}`);
          } else {
            console.log(chalk.yellow('No model set'));
          }
        } else {
          const value = await configManager.getConfigValue(key);
          if (value) {
            console.log(`${key}: ${value}`);
          } else {
            console.log(chalk.yellow(`No value set for: ${key}`));
          }
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

/**
 * config show command
 */
function createShowCommand(): Command {
  return new Command('show')
    .description('Show all configuration values')
    .action(async () => {
      try {
        const configManager = getConfigManager();

        console.log(chalk.cyan.bold('\nCodeTandem Configuration\n'));
        console.log('━'.repeat(50));

        // Provider
        const provider = await configManager.getProvider();
        console.log(
          chalk.cyan('Provider:    ') + (provider || chalk.dim('not set'))
        );

        // Model
        const model = await configManager.getModel();
        console.log(
          chalk.cyan('Model:       ') + (model || chalk.dim('not set'))
        );

        // API Key
        if (provider) {
          const apiKey = await getApiKey(provider);
          if (apiKey) {
            const maskedKey = apiKey.length > 8 ? apiKey.slice(0, 8) + '...' : '***';
            console.log(chalk.cyan('API Key:     ') + maskedKey);
          } else {
            console.log(chalk.cyan('API Key:     ') + chalk.dim('not set'));
          }
        } else {
          console.log(chalk.cyan('API Key:     ') + chalk.dim('not set'));
        }

        console.log('━'.repeat(50) + '\n');
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}

/**
 * config clear command
 */
function createClearCommand(): Command {
  return new Command('clear')
    .description('Clear a configuration value')
    .argument('<key>', 'Configuration key to clear (provider, model, api_key)')
    .action(async (key: string) => {
      try {
        const configManager = getConfigManager();

        if (key === 'api_key') {
          const provider = await configManager.getProvider();
          if (!provider) {
            console.log(chalk.red('Error:') + ' No provider set.');
            process.exit(1);
          }

          await deleteApiKey(provider);
          console.log(chalk.green('✓') + ` API key cleared for provider: ${provider}`);
        } else if (key === 'provider') {
          await configManager.setConfigValue('provider', null);
          console.log(chalk.green('✓') + ' Provider cleared');
        } else if (key === 'model') {
          await configManager.setConfigValue('model', null);
          console.log(chalk.green('✓') + ' Model cleared');
        } else {
          await configManager.setConfigValue(key, null);
          console.log(chalk.green('✓') + ` ${key} cleared`);
        }
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
