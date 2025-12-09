/**
 * AI Provider Type Definitions
 */

/**
 * Token usage information from AI API
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Standardized response from AI providers
 */
export interface AIResponse {
  content: string;
  model: string;
  usage?: TokenUsage;
  metadata?: Record<string, unknown>;
}

/**
 * Context information for AI requests
 */
export interface AIContext {
  filePath?: string;
  language?: string;
  description?: string;
  requirements?: string;
  [key: string]: unknown;
}

/**
 * Chat message format
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
}
