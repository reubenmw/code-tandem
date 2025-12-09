/**
 * Factory function for creating AI provider instances
 */

import type { BaseAIProvider } from './base.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { GeminiProvider } from './gemini.js';
import type { ProviderConfig } from '../types/ai.js';

export type ProviderName = 'openai' | 'anthropic' | 'claude' | 'gemini';

export interface ProviderFactoryOptions {
  providerName: ProviderName;
  model: string;
  apiKey: string;
}

/**
 * Get an AI provider instance based on configuration
 *
 * @param options Provider configuration options
 * @returns Initialized provider instance
 * @throws Error if provider is unsupported
 */
export function getAIProvider(options: ProviderFactoryOptions): BaseAIProvider {
  const { providerName, model, apiKey } = options;

  const config: ProviderConfig = {
    apiKey,
    model,
  };

  const providerNameLower = providerName.toLowerCase() as ProviderName;

  switch (providerNameLower) {
    case 'openai':
      return new OpenAIProvider(config);

    case 'gemini':
      return new GeminiProvider(config);

    case 'anthropic':
    case 'claude':
      return new AnthropicProvider(config);

    default:
      throw new Error(
        `Unsupported provider: ${providerName}. Supported providers: openai, gemini, anthropic`
      );
  }
}
