import { describe, it, expect, vi } from 'vitest';
import {
  buildReviewPrompt,
  parseReviewResponse,
  reviewCodeWithAI,
  formatReviewFeedback,
  type ReviewResult
} from './review.js';
import type { CodeExtraction } from './code-parser.js';
import { BaseAIProvider } from '../providers/base.js';

describe('review', () => {
  const sampleExtraction: CodeExtraction = {
    filePath: 'test.js',
    code: 'function test() { return 42; }',
    todoText: 'Implement test function',
    startLine: 1,
    endLine: 3,
    beforeContext: '',
    afterContext: ''
  };

  describe('buildReviewPrompt', () => {
    it('should build basic review prompt', () => {
      const prompt = buildReviewPrompt(sampleExtraction);

      expect(prompt).toContain('Code Review Request');
      expect(prompt).toContain('TODO: Implement test function');
      expect(prompt).toContain('File: test.js');
      expect(prompt).toContain('function test() { return 42; }');
      expect(prompt).toContain('Correctness');
    });

    it('should include module context when provided', () => {
      const prompt = buildReviewPrompt(
        sampleExtraction,
        'Learning about functions',
        undefined
      );

      expect(prompt).toContain('Learning Module Context');
      expect(prompt).toContain('Learning about functions');
    });

    it('should include objective when provided', () => {
      const prompt = buildReviewPrompt(
        sampleExtraction,
        undefined,
        'Create a function that returns 42'
      );

      expect(prompt).toContain('The user was asked to: Create a function that returns 42');
    });
  });

  describe('parseReviewResponse', () => {
    it('should parse valid JSON response', () => {
      const response = JSON.stringify({
        success: true,
        feedback: 'Great job!',
        score: 95,
        suggestions: ['Add comments', 'Add tests']
      });

      const result = parseReviewResponse(response);

      expect(result.success).toBe(true);
      expect(result.feedback).toBe('Great job!');
      expect(result.score).toBe(95);
      expect(result.suggestions).toHaveLength(2);
    });

    it('should handle JSON wrapped in markdown code blocks', () => {
      const response = '```json\n{"success": true, "feedback": "Good"}\n```';

      const result = parseReviewResponse(response);

      expect(result.success).toBe(true);
      expect(result.feedback).toBe('Good');
    });

    it('should handle invalid JSON gracefully', () => {
      const response = 'This is not JSON';

      const result = parseReviewResponse(response);

      expect(result.success).toBe(false);
      expect(result.feedback).toContain('Failed to parse AI response');
    });

    it('should handle missing optional fields', () => {
      const response = JSON.stringify({
        success: false,
        feedback: 'Needs work'
      });

      const result = parseReviewResponse(response);

      expect(result.success).toBe(false);
      expect(result.feedback).toBe('Needs work');
      expect(result.score).toBeUndefined();
      expect(result.suggestions).toBeUndefined();
    });
  });

  describe('reviewCodeWithAI', () => {
    it('should call AI provider and parse response', async () => {
      const mockProvider = {
        chat: vi.fn().mockResolvedValue({
          content: JSON.stringify({
            success: true,
            feedback: 'Excellent work',
            score: 100,
            suggestions: []
          }),
          model: 'test-model'
        })
      } as unknown as BaseAIProvider;

      const result = await reviewCodeWithAI(mockProvider, sampleExtraction);

      expect(mockProvider.chat).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.feedback).toBe('Excellent work');
      expect(result.score).toBe(100);
    });

    it('should handle AI provider errors', async () => {
      const mockProvider = {
        chat: vi.fn().mockRejectedValue(new Error('API error'))
      } as unknown as BaseAIProvider;

      const result = await reviewCodeWithAI(mockProvider, sampleExtraction);

      expect(result.success).toBe(false);
      expect(result.feedback).toContain('Error during AI review');
    });
  });

  describe('formatReviewFeedback', () => {
    it('should format successful review', () => {
      const review: ReviewResult = {
        success: true,
        feedback: 'Great work!',
        score: 95,
        suggestions: ['Add more tests']
      };

      const formatted = formatReviewFeedback(review);

      expect(formatted).toContain('✓ PASSED');
      expect(formatted).toContain('95/100');
      expect(formatted).toContain('Great work!');
      expect(formatted).toContain('Add more tests');
    });

    it('should format failed review', () => {
      const review: ReviewResult = {
        success: false,
        feedback: 'Needs improvement',
        score: 45,
        suggestions: ['Fix logic', 'Improve readability']
      };

      const formatted = formatReviewFeedback(review);

      expect(formatted).toContain('✗ NEEDS IMPROVEMENT');
      expect(formatted).toContain('45/100');
      expect(formatted).toContain('Needs improvement');
      expect(formatted).toContain('Fix logic');
      expect(formatted).toContain('Improve readability');
    });

    it('should handle review without score', () => {
      const review: ReviewResult = {
        success: true,
        feedback: 'Good'
      };

      const formatted = formatReviewFeedback(review);

      expect(formatted).not.toContain('/100');
      expect(formatted).toContain('Good');
    });
  });
});
