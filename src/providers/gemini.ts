/**
 * Google Gemini provider implementation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIResponse, AIContext, ChatMessage, ProviderConfig } from '../types/ai.js';
import { BaseAIProvider } from './base.js';

/**
 * Google Gemini API provider implementation
 */
export class GeminiProvider extends BaseAIProvider {
  private genAI: GoogleGenerativeAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }

  /**
   * Generate code suggestions using Gemini
   */
  async generateCodeSuggestion(
    prompt: string,
    context?: AIContext,
    temperature: number = 0.7
  ): Promise<AIResponse> {
    // Build the full prompt with context
    const contextStr = this.buildContextPrompt(context);
    const systemPrompt = 'You are an expert programmer. Generate clear, well-documented code.';
    const fullPrompt = contextStr
      ? `${systemPrompt}\n\n${contextStr}\n\n${prompt}`
      : `${systemPrompt}\n\n${prompt}`;

    // Get the model
    const model = this.genAI.getGenerativeModel({
      model: this.model,
    });

    // Call Gemini API
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature,
      },
    });

    const response = result.response;
    const content = response.text();

    // Extract usage info if available
    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        }
      : undefined;

    const metadata: Record<string, unknown> = {};
    if (response.candidates?.[0]) {
      metadata.finishReason = response.candidates[0].finishReason;
    }

    return {
      content,
      model: this.model,
      usage,
      metadata,
    };
  }

  /**
   * Review code using Gemini
   */
  async reviewCode(codeSnippet: string, context?: AIContext): Promise<AIResponse> {
    const contextStr = this.buildContextPrompt(context);
    const systemPrompt =
      'You are an expert code reviewer. Provide constructive, actionable feedback.';
    let prompt = contextStr ? `${systemPrompt}\n\n${contextStr}\n\n` : `${systemPrompt}\n\n`;
    prompt += `Please review the following code and provide feedback:\n\n\`\`\`\n${codeSnippet}\n\`\`\``;

    const model = this.genAI.getGenerativeModel({
      model: this.model,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3, // Lower temperature for more focused reviews
      },
    });

    const response = result.response;
    const content = response.text();

    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        }
      : undefined;

    const metadata: Record<string, unknown> = {};
    if (response.candidates?.[0]) {
      metadata.finishReason = response.candidates[0].finishReason;
    }

    return {
      content,
      model: this.model,
      usage,
      metadata,
    };
  }

  /**
   * Chat with Gemini
   */
  async chat(messages: ChatMessage[], temperature: number = 0.7): Promise<AIResponse> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature,
      },
    });

    // Convert our messages to Gemini format
    // Gemini doesn't have a system role, so we'll prepend system messages to the first user message
    const systemMessages = messages.filter((msg) => msg.role === 'system');
    const conversationMessages = messages.filter((msg) => msg.role !== 'system');

    const systemPrefix =
      systemMessages.length > 0
        ? systemMessages.map((msg) => msg.content).join('\n\n') + '\n\n'
        : '';

    // Build chat history
    const history = [];
    for (let i = 0; i < conversationMessages.length - 1; i++) {
      const msg = conversationMessages[i];
      if (msg) {
        history.push({
          role: msg.role === 'user' ? ('user' as const) : ('model' as const),
          parts: [{ text: msg.content }],
        });
      }
    }

    // Start chat with history
    const chat = model.startChat({ history });

    // Get the last message
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    const lastContent = lastMessage?.content ?? '';
    const messageWithSystem = systemPrefix ? systemPrefix + lastContent : lastContent;

    // Send the last message
    const result = await chat.sendMessage(messageWithSystem);

    // Note: Gemini's sendMessage doesn't accept generationConfig in the second parameter
    // Temperature is set when creating the model instance

    const response = result.response;
    const content = response.text();

    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        }
      : undefined;

    const metadata: Record<string, unknown> = {};
    if (response.candidates?.[0]) {
      metadata.finishReason = response.candidates[0].finishReason;
    }

    return {
      content,
      model: this.model,
      usage,
      metadata,
    };
  }
}
