/**
 * Anthropic (Claude) provider implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIResponse, AIContext, ChatMessage, ProviderConfig } from '../types/ai.js';
import { BaseAIProvider } from './base.js';

/**
 * Anthropic Claude API provider implementation
 */
export class AnthropicProvider extends BaseAIProvider {
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * Generate code suggestions using Claude
   */
  async generateCodeSuggestion(
    prompt: string,
    context?: AIContext,
    temperature: number = 0.7
  ): Promise<AIResponse> {
    // Build the full prompt with context
    const contextStr = this.buildContextPrompt(context);
    const fullPrompt = contextStr ? `${contextStr}\n\n${prompt}` : prompt;

    // Call Anthropic API
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature,
      system: 'You are an expert programmer. Generate clear, well-documented code.',
      messages: [{ role: 'user', content: fullPrompt }],
    });

    // Parse response
    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

    return {
      content,
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      metadata: { stopReason: response.stop_reason },
    };
  }

  /**
   * Review code using Claude
   */
  async reviewCode(codeSnippet: string, context?: AIContext): Promise<AIResponse> {
    const contextStr = this.buildContextPrompt(context);
    let prompt = contextStr ? `${contextStr}\n\n` : '';
    prompt += `Please review the following code and provide feedback:\n\n\`\`\`\n${codeSnippet}\n\`\`\``;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature: 0.3, // Lower temperature for reviews
      system: 'You are an expert code reviewer. Provide constructive, actionable feedback.',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

    return {
      content,
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      metadata: { stopReason: response.stop_reason },
    };
  }

  /**
   * Chat with Claude
   */
  async chat(messages: ChatMessage[], temperature: number = 0.7): Promise<AIResponse> {
    // Convert our ChatMessage format to Anthropic's format
    const anthropicMessages = messages
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    // Extract system message if present
    const systemMessage = messages.find((msg) => msg.role === 'system')?.content;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      temperature,
      ...(systemMessage && { system: systemMessage }),
      messages: anthropicMessages,
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

    return {
      content,
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      metadata: { stopReason: response.stop_reason },
    };
  }
}
