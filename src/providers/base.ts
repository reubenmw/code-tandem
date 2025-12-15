/**
 * Base abstract class for AI providers
 */

import type { AIResponse, AIContext, ChatMessage, ProviderConfig } from '../types/ai.js';

/**
 * Abstract base class for AI provider implementations
 */
export abstract class BaseAIProvider {
  protected apiKey: string;
  protected model: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  /* eslint-disable no-unused-vars */
  /**
   * Generate code suggestions based on a prompt
   */
  abstract generateCodeSuggestion(
    prompt: string,
    context?: AIContext,
    temperature?: number
  ): Promise<AIResponse>;

  /**
   * Review code and provide feedback
   */
  abstract reviewCode(codeSnippet: string, context?: AIContext): Promise<AIResponse>;

  /**
   * Have a chat conversation with the AI
   */
  abstract chat(messages: ChatMessage[], temperature?: number): Promise<AIResponse>;
  /* eslint-enable no-unused-vars */

  /**
   * Build a context string from context object
   */
  protected buildContextPrompt(context?: AIContext): string {
    if (!context) {
      return '';
    }

    const parts: string[] = [];

    if (context.filePath) {
      parts.push(`File: ${context.filePath}`);
    }

    if (context.language) {
      parts.push(`Language: ${context.language}`);
    }

    if (context.description) {
      parts.push(`Description: ${context.description}`);
    }

    if (context.requirements) {
      parts.push(`Requirements: ${context.requirements}`);
    }

    return parts.join('\n');
  }
}
