/**
 * Interactive setup command
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getConfigManager } from '../utils/config.js';
import { setApiKey } from '../utils/secrets.js';
import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';

const PROVIDERS = ['openai', 'anthropic', 'google'];

async function selectProvider(rl: readline.Interface): Promise<string> {
  console.log(chalk.cyan('Select your AI provider:'));
  PROVIDERS.forEach((provider, index) => {
    console.log(`${index + 1}. ${provider}`);
  });

  let providerIndex = -1;
  while (providerIndex < 0 || providerIndex >= PROVIDERS.length) {
    const answer = await rl.question('Enter the number of your provider: ');
    providerIndex = parseInt(answer, 10) - 1;
    if (providerIndex < 0 || providerIndex >= PROVIDERS.length) {
      console.log(chalk.red('Invalid selection. Please try again.'));
    }
  }
  return PROVIDERS[providerIndex];
}

async function enterApiKey(rl: readline.Interface, provider: string): Promise<string> {
  let apiKey = '';
  while (apiKey.trim() === '') {
    apiKey = await rl.question(`Enter your API key for ${provider}: `);
    if (apiKey.trim() === '') {
      console.log(chalk.red('API key cannot be empty.'));
    }
  }
  return apiKey;
}

async function enterModel(rl: readline.Interface, provider: string): Promise<string> {
  const defaultModels = {
    openai: 'gpt-4',
    anthropic: 'claude-3-opus-20240229',
    google: 'gemini-pro',
  };
  const defaultModel = defaultModels[provider];

  let model = '';
  while (model.trim() === '') {
    model = await rl.question(`Enter the model name for ${provider} (default: ${defaultModel}): `);
    if (model.trim() === '') {
      model = defaultModel;
    }
  }
  return model;
}

export const setupCommand = new Command('setup')
  .description('Interactive setup for CodeTandem')
  .action(async () => {
    const rl = readline.createInterface({ input, output });
    const configManager = getConfigManager();

    try {
      console.log(chalk.bold.cyan('\nWelcome to CodeTandem Setup!\n'));

      // 1. Select Provider
      const provider = await selectProvider(rl);
      await configManager.setProvider(provider);
      console.log(chalk.green('✓') + ` Provider set to: ${provider}`);

      // 2. Enter API Key
      const apiKey = await enterApiKey(rl, provider);
      await setApiKey(provider, apiKey);
      console.log(chalk.green('✓') + ` API key securely stored for provider: ${provider}`);

      // 3. Enter Model
      const model = await enterModel(rl, provider);
      await configManager.setModel(model);
      console.log(chalk.green('✓') + ` Model set to: ${model}`);

      console.log(chalk.bold.green('\nSetup complete! You are ready to use CodeTandem.'));
    } catch (error) {
      console.error(chalk.red('Error during setup:'), error instanceof Error ? error.message : error);
    } finally {
      rl.close();
    }
  });
