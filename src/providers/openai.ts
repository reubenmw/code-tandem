/**
 * OpenAI provider implementation
 */

import OpenAI from 'openai';
import type { AIResponse, AIContext, ChatMessage, ProviderConfig } from '../types/ai.js';
import { BaseAIProvider } from './base.js';

/**
 * OpenAI API provider implementation
 */
export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  /**
   * Generate code suggestions using OpenAI
   */
  async generateCodeSuggestion(
    prompt: string,
    context?: AIContext,
    temperature: number = 0.7
  ): Promise<AIResponse> {
    // Build the full prompt with context
    const contextStr = this.buildContextPrompt(context);
    const fullPrompt = contextStr ? `${contextStr}\n\n${prompt}` : prompt;

    // Create the messages
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are an expert programmer. Generate clear, well-documented code.',
      },
      { role: 'user', content: fullPrompt },
    ];

    // Call OpenAI API
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature,
    });

    // Parse response
    const content = response.choices[0]?.message?.content ?? '';
    const usage = response.usage;

    return {
      content,
      model: response.model,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
      metadata: { finishReason: response.choices[0]?.finish_reason },
    };
  }

  /**
   * Review code using OpenAI
   */
  async reviewCode(codeSnippet: string, context?: AIContext): Promise<AIResponse> {
    const contextStr = this.buildContextPrompt(context);
    let prompt = contextStr ? `${contextStr}\n\n` : '';
    prompt += `Please review the following code and provide feedback:\n\n\`\`\`\n${codeSnippet}\n\`\`\``;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are an expert code reviewer. Provide constructive, actionable feedback.',
      },
      { role: 'user', content: prompt },
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.3, // Lower temperature for more focused reviews
    });

    const content = response.choices[0]?.message?.content ?? '';
    const usage = response.usage;

    return {
      content,
      model: response.model,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
      metadata: { finishReason: response.choices[0]?.finish_reason },
    };
  }

  /**
   * Chat with OpenAI
   */
  async chat(messages: ChatMessage[], temperature: number = 0.7): Promise<AIResponse> {
    // Convert our ChatMessage format to OpenAI's format
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      temperature,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const usage = response.usage;

    return {
      content,
      model: response.model,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
      metadata: { finishReason: response.choices[0]?.finish_reason },
    };
  }
}
