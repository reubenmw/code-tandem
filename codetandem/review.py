"""
AI-powered code review functionality.

This module handles generating prompts for AI code review and parsing
the AI's feedback.
"""

import json
from typing import Optional, Dict, Any
from dataclasses import dataclass

from codetandem.code_parser import CodeExtraction
from codetandem.providers.base import BaseAIProvider


@dataclass
class ReviewResult:
    """Represents the result of an AI code review."""

    success: bool
    feedback: str
    score: Optional[float] = None
    suggestions: Optional[list[str]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "success": self.success,
            "feedback": self.feedback,
            "score": self.score,
            "suggestions": self.suggestions or [],
        }


def build_review_prompt(
    code_extraction: CodeExtraction,
    module_context: Optional[str] = None,
    objective: Optional[str] = None,
) -> str:
    """
    Build a comprehensive prompt for AI code review.

    Args:
        code_extraction: Extracted code and TODO information
        module_context: Optional context about the current learning module
        objective: Optional specific learning objective being addressed

    Returns:
        Formatted prompt string for AI review
    """
    prompt_parts = []

    # Header
    prompt_parts.append("# Code Review Request")
    prompt_parts.append("")
    prompt_parts.append(
        "You are an expert code reviewer. Please review the following code submission."
    )
    prompt_parts.append("")

    # Context
    if module_context:
        prompt_parts.append(f"## Learning Module Context")
        prompt_parts.append(module_context)
        prompt_parts.append("")

    # Task description
    prompt_parts.append("## Task")
    if objective:
        prompt_parts.append(f"The user was asked to: {objective}")
    else:
        prompt_parts.append(f"TODO: {code_extraction.todo_text}")
    prompt_parts.append("")

    # Code submission
    prompt_parts.append("## User's Code Submission")
    prompt_parts.append(f"File: {code_extraction.file_path}")
    prompt_parts.append(
        f"Lines: {code_extraction.start_line}-{code_extraction.end_line}"
    )
    prompt_parts.append("")
    prompt_parts.append("```")
    prompt_parts.append(code_extraction.code)
    prompt_parts.append("```")
    prompt_parts.append("")

    # Review criteria
    prompt_parts.append("## Review Criteria")
    prompt_parts.append("")
    prompt_parts.append("Please evaluate the code based on:")
    prompt_parts.append("1. **Correctness**: Does the code fulfill the TODO/objective?")
    prompt_parts.append(
        "2. **Code Quality**: Is the code well-structured and readable?"
    )
    prompt_parts.append(
        "3. **Best Practices**: Does it follow language-specific conventions?"
    )
    prompt_parts.append(
        "4. **Learning Goals**: Does it demonstrate understanding of key concepts?"
    )
    prompt_parts.append("")

    # Response format
    prompt_parts.append("## Required Response Format")
    prompt_parts.append("")
    prompt_parts.append("Respond with a JSON object in this exact format:")
    prompt_parts.append("```json")
    prompt_parts.append("{")
    prompt_parts.append('  "success": true or false,')
    prompt_parts.append('  "feedback": "Detailed feedback message",')
    prompt_parts.append('  "score": 0-100 (numeric score),')
    prompt_parts.append('  "suggestions": ["suggestion 1", "suggestion 2", ...]')
    prompt_parts.append("}")
    prompt_parts.append("```")
    prompt_parts.append("")
    prompt_parts.append(
        "- Set `success` to `true` if the code correctly completes the task"
    )
    prompt_parts.append("- Set `success` to `false` if there are significant issues")
    prompt_parts.append("- Provide constructive `feedback` regardless of success")
    prompt_parts.append("- Include a `score` from 0-100 indicating code quality")
    prompt_parts.append("- List specific `suggestions` for improvement")
    prompt_parts.append("")
    prompt_parts.append(
        "**IMPORTANT**: Your entire response must be valid JSON. Do not include any text outside the JSON object."
    )

    return "\n".join(prompt_parts)


def parse_review_response(response_text: str) -> ReviewResult:
    """
    Parse the AI's review response.

    Args:
        response_text: Raw text response from AI

    Returns:
        ReviewResult object with parsed feedback
    """
    # Try to extract JSON from response
    response_text = response_text.strip()

    # Remove markdown code blocks if present
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    elif response_text.startswith("```"):
        response_text = response_text[3:]

    if response_text.endswith("```"):
        response_text = response_text[:-3]

    response_text = response_text.strip()

    try:
        data = json.loads(response_text)

        return ReviewResult(
            success=data.get("success", False),
            feedback=data.get("feedback", "No feedback provided"),
            score=data.get("score"),
            suggestions=data.get("suggestions"),
        )
    except json.JSONDecodeError as e:
        # If JSON parsing fails, treat as a failure with the raw text as feedback
        return ReviewResult(
            success=False,
            feedback=f"Failed to parse AI response: {str(e)}\n\nRaw response:\n{response_text}",
            score=None,
            suggestions=None,
        )


async def review_code_with_ai(
    provider: BaseAIProvider,
    code_extraction: CodeExtraction,
    module_context: Optional[str] = None,
    objective: Optional[str] = None,
    temperature: float = 0.3,
) -> ReviewResult:
    """
    Submit code to AI for review.

    Args:
        provider: AI provider instance
        code_extraction: Extracted code and TODO information
        module_context: Optional context about the current learning module
        objective: Optional specific learning objective
        temperature: AI temperature setting (lower = more consistent)

    Returns:
        ReviewResult with AI's feedback
    """
    # Build the review prompt
    prompt = build_review_prompt(code_extraction, module_context, objective)

    try:
        # Get AI response
        response = await provider.chat(
            messages=[{"role": "user", "content": prompt}], temperature=temperature
        )

        # Parse the response
        result = parse_review_response(response.content)

        return result

    except Exception as e:
        return ReviewResult(
            success=False,
            feedback=f"Error during AI review: {str(e)}",
            score=None,
            suggestions=None,
        )


def format_review_feedback(review: ReviewResult) -> str:
    """
    Format review results for display to user.

    Args:
        review: ReviewResult object

    Returns:
        Formatted feedback string
    """
    lines = []

    # Status
    status = "✓ PASSED" if review.success else "✗ NEEDS IMPROVEMENT"
    lines.append(f"## Review Result: {status}")
    lines.append("")

    # Score
    if review.score is not None:
        lines.append(f"**Score**: {review.score}/100")
        lines.append("")

    # Feedback
    lines.append("### Feedback")
    lines.append(review.feedback)
    lines.append("")

    # Suggestions
    if review.suggestions:
        lines.append("### Suggestions for Improvement")
        for i, suggestion in enumerate(review.suggestions, 1):
            lines.append(f"{i}. {suggestion}")
        lines.append("")

    return "\n".join(lines)
