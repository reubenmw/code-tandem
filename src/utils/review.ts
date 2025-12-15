/**
 * AI-powered code review functionality.
 *
 * Handles generating prompts for AI code review and parsing the AI's feedback.
 */

import { BaseAIProvider } from '../providers/base.js';
import type { CodeExtraction } from './code-parser.js';

export interface ReviewResult {
  success: boolean;
  feedback: string;
  score?: number;
  suggestions?: string[];
}

/**
 * Build a comprehensive prompt for AI code review.
 *
 * @param codeExtraction Extracted code and TODO information
 * @param moduleContext Optional context about the current learning module
 * @param objective Optional specific learning objective being addressed
 * @returns Formatted prompt string for AI review
 */
export function buildReviewPrompt(
  codeExtraction: CodeExtraction,
  moduleContext?: string,
  objective?: string
): string {
  const promptParts: string[] = [];

  // Header
  promptParts.push('# Code Review Request');
  promptParts.push('');
  promptParts.push('You are an expert code reviewer. Please review the following code submission.');
  promptParts.push('');

  // Context
  if (moduleContext) {
    promptParts.push('## Learning Module Context');
    promptParts.push(moduleContext);
    promptParts.push('');
  }

  // Task description
  promptParts.push('## Task');
  if (objective) {
    promptParts.push(`The user was asked to: ${objective}`);
  } else {
    promptParts.push(`TODO: ${codeExtraction.todoText}`);
  }
  promptParts.push('');

  // Code submission
  promptParts.push("## User's Code Submission");
  promptParts.push(`File: ${codeExtraction.filePath}`);
  promptParts.push(`Lines: ${codeExtraction.startLine}-${codeExtraction.endLine}`);
  promptParts.push('');
  promptParts.push('```');
  promptParts.push(codeExtraction.code);
  promptParts.push('```');
  promptParts.push('');

  // Review criteria
  promptParts.push('## Review Criteria');
  promptParts.push('');
  promptParts.push('Please evaluate the code based on:');
  promptParts.push('1. **Correctness**: Does the code fulfill the TODO/objective?');
  promptParts.push('2. **Code Quality**: Is the code well-structured and readable?');
  promptParts.push('3. **Best Practices**: Does it follow language-specific conventions?');
  promptParts.push('4. **Learning Goals**: Does it demonstrate understanding of key concepts?');
  promptParts.push('');

  // Response format
  promptParts.push('## Required Response Format');
  promptParts.push('');
  promptParts.push('Respond with a JSON object in this exact format:');
  promptParts.push('```json');
  promptParts.push('{');
  promptParts.push('  "success": true or false,');
  promptParts.push('  "feedback": "Detailed feedback message",');
  promptParts.push('  "score": 0-100 (numeric score),');
  promptParts.push('  "suggestions": ["suggestion 1", "suggestion 2", ...]');
  promptParts.push('}');
  promptParts.push('```');
  promptParts.push('');
  promptParts.push('- Set `success` to `true` if the code correctly completes the task');
  promptParts.push('- Set `success` to `false` if there are significant issues');
  promptParts.push('- Provide constructive `feedback` regardless of success');
  promptParts.push('- Include a `score` from 0-100 indicating code quality');
  promptParts.push('- List specific `suggestions` for improvement');
  promptParts.push('');
  promptParts.push(
    '**IMPORTANT**: Your entire response must be valid JSON. Do not include any text outside the JSON object.'
  );

  return promptParts.join('\n');
}

/**
 * Parse the AI's review response.
 *
 * @param responseText Raw text response from AI
 * @returns ReviewResult object with parsed feedback
 */
export function parseReviewResponse(responseText: string): ReviewResult {
  let text = responseText.trim();

  // Remove markdown code blocks if present
  if (text.startsWith('```json')) {
    text = text.substring(7);
  } else if (text.startsWith('```')) {
    text = text.substring(3);
  }

  if (text.endsWith('```')) {
    text = text.substring(0, text.length - 3);
  }

  text = text.trim();

  try {
    const data = JSON.parse(text) as Record<string, unknown>;

    return {
      success: data.success === true,
      feedback: typeof data.feedback === 'string' ? data.feedback : 'No feedback provided',
      score: typeof data.score === 'number' ? data.score : undefined,
      suggestions: Array.isArray(data.suggestions) ? (data.suggestions as string[]) : undefined,
    };
  } catch (e) {
    // If JSON parsing fails, treat as a failure with the raw text as feedback
    const error = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      feedback: `Failed to parse AI response: ${error}\n\nRaw response:\n${responseText}`,
      score: undefined,
      suggestions: undefined,
    };
  }
}

/**
 * Submit code to AI for review.
 *
 * @param provider AI provider instance
 * @param codeExtraction Extracted code and TODO information
 * @param moduleContext Optional context about the current learning module
 * @param objective Optional specific learning objective
 * @param temperature AI temperature setting (lower = more consistent)
 * @returns ReviewResult with AI's feedback
 */
export async function reviewCodeWithAI(
  provider: BaseAIProvider,
  codeExtraction: CodeExtraction,
  moduleContext?: string,
  objective?: string,
  temperature: number = 0.3
): Promise<ReviewResult> {
  // Build the review prompt
  const prompt = buildReviewPrompt(codeExtraction, moduleContext, objective);

  try {
    // Get AI response
    const response = await provider.chat([{ role: 'user', content: prompt }], temperature);

    // Parse the response
    const result = parseReviewResponse(response.content);

    return result;
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      feedback: `Error during AI review: ${error}`,
      score: undefined,
      suggestions: undefined,
    };
  }
}

/**
 * Format review results for display to user.
 *
 * @param review ReviewResult object
 * @returns Formatted feedback string
 */
export function formatReviewFeedback(review: ReviewResult): string {
  const lines: string[] = [];

  // Status
  const status = review.success ? '✓ PASSED' : '✗ NEEDS IMPROVEMENT';
  lines.push(`## Review Result: ${status}`);
  lines.push('');

  // Score
  if (review.score !== undefined) {
    lines.push(`**Score**: ${review.score}/100`);
    lines.push('');
  }

  // Feedback
  lines.push('### Feedback');
  lines.push(review.feedback);
  lines.push('');

  // Suggestions
  if (review.suggestions && review.suggestions.length > 0) {
    lines.push('### Suggestions for Improvement');
    for (let i = 0; i < review.suggestions.length; i++) {
      lines.push(`${i + 1}. ${review.suggestions[i]}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
