import { describe, it, expect } from 'vitest';
import { getAIProvider } from './factory.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { GeminiProvider } from './gemini.js';

describe('Provider Factory', () => {
  const mockApiKey = 'test-api-key-12345';
  const mockModel = 'test-model';

  describe('getAIProvider', () => {
    it('should create OpenAI provider', () => {
      const provider = getAIProvider({
        providerName: 'openai',
        model: mockModel,
        apiKey: mockApiKey,
      });

      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should create Anthropic provider', () => {
      const provider = getAIProvider({
        providerName: 'anthropic',
        model: mockModel,
        apiKey: mockApiKey,
      });

      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should create Anthropic provider with "claude" alias', () => {
      const provider = getAIProvider({
        providerName: 'claude',
        model: mockModel,
        apiKey: mockApiKey,
      });

      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should create Gemini provider', () => {
      const provider = getAIProvider({
        providerName: 'gemini',
        model: mockModel,
        apiKey: mockApiKey,
      });

      expect(provider).toBeInstanceOf(GeminiProvider);
    });

    it('should handle case-insensitive provider names', () => {
      const provider = getAIProvider({
        providerName: 'OPENAI' as any,
        model: mockModel,
        apiKey: mockApiKey,
      });

      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should throw error for unsupported provider', () => {
      expect(() =>
        getAIProvider({
          providerName: 'invalid-provider' as any,
          model: mockModel,
          apiKey: mockApiKey,
        })
      ).toThrow('Unsupported provider');
    });
  });
});
