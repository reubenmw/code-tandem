import { describe, it, expect } from 'vitest';
import { BaseAIProvider } from './base.js';
import type { AIResponse, AIContext, ChatMessage } from '../types/ai.js';

// Create a concrete test implementation
class TestProvider extends BaseAIProvider {
  async generateCodeSuggestion(): Promise<AIResponse> {
    return {
      content: 'test',
      model: this.model,
    };
  }

  async reviewCode(): Promise<AIResponse> {
    return {
      content: 'test',
      model: this.model,
    };
  }

  async chat(): Promise<AIResponse> {
    return {
      content: 'test',
      model: this.model,
    };
  }

  // Expose protected method for testing
  public testBuildContextPrompt(context?: AIContext): string {
    return this.buildContextPrompt(context);
  }
}

describe('BaseAIProvider', () => {
  const provider = new TestProvider({
    apiKey: 'test-key',
    model: 'test-model',
  });

  describe('buildContextPrompt', () => {
    it('should return empty string for undefined context', () => {
      const result = provider.testBuildContextPrompt();
      expect(result).toBe('');
    });

    it('should return empty string for empty context', () => {
      const result = provider.testBuildContextPrompt({});
      expect(result).toBe('');
    });

    it('should build context with file path', () => {
      const result = provider.testBuildContextPrompt({
        filePath: '/path/to/file.ts',
      });
      expect(result).toBe('File: /path/to/file.ts');
    });

    it('should build context with language', () => {
      const result = provider.testBuildContextPrompt({
        language: 'typescript',
      });
      expect(result).toBe('Language: typescript');
    });

    it('should build context with description', () => {
      const result = provider.testBuildContextPrompt({
        description: 'Test description',
      });
      expect(result).toBe('Description: Test description');
    });

    it('should build context with requirements', () => {
      const result = provider.testBuildContextPrompt({
        requirements: 'Must use async/await',
      });
      expect(result).toBe('Requirements: Must use async/await');
    });

    it('should build context with all fields', () => {
      const result = provider.testBuildContextPrompt({
        filePath: '/path/to/file.ts',
        language: 'typescript',
        description: 'Test description',
        requirements: 'Must use async/await',
      });

      expect(result).toContain('File: /path/to/file.ts');
      expect(result).toContain('Language: typescript');
      expect(result).toContain('Description: Test description');
      expect(result).toContain('Requirements: Must use async/await');
    });
  });
});
