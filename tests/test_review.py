"""Tests for AI code review functionality."""

import pytest
from unittest.mock import Mock, AsyncMock
from codetandem.review import (
    build_review_prompt,
    parse_review_response,
    review_code_with_ai,
    format_review_feedback,
    ReviewResult,
)
from codetandem.code_parser import CodeExtraction
from codetandem.providers.base import AIResponse


@pytest.fixture
def sample_code_extraction():
    """Create a sample code extraction."""
    return CodeExtraction(
        file_path="test.py",
        todo_line=5,
        todo_text="Implement hello function",
        code='def hello():\n    return "Hello, World!"',
        start_line=6,
        end_line=7,
    )


def test_review_result_to_dict():
    """Test ReviewResult to_dict conversion."""
    result = ReviewResult(
        success=True,
        feedback="Good work!",
        score=85.0,
        suggestions=["Add type hints", "Add docstring"],
    )

    data = result.to_dict()
    assert data["success"] is True
    assert data["feedback"] == "Good work!"
    assert data["score"] == 85.0
    assert len(data["suggestions"]) == 2


def test_build_review_prompt_basic(sample_code_extraction):
    """Test building basic review prompt."""
    prompt = build_review_prompt(sample_code_extraction)

    assert "Code Review Request" in prompt
    assert "Implement hello function" in prompt
    assert "def hello():" in prompt
    assert "test.py" in prompt
    assert "JSON" in prompt


def test_build_review_prompt_with_context(sample_code_extraction):
    """Test building review prompt with module context."""
    prompt = build_review_prompt(
        sample_code_extraction,
        module_context="Module: Python Basics",
        objective="Learn function definitions",
    )

    assert "Python Basics" in prompt
    assert "Learn function definitions" in prompt


def test_parse_review_response_valid_json():
    """Test parsing valid JSON review response."""
    response = """{
        "success": true,
        "feedback": "Excellent implementation!",
        "score": 95,
        "suggestions": ["Consider edge cases"]
    }"""

    result = parse_review_response(response)
    assert result.success is True
    assert result.feedback == "Excellent implementation!"
    assert result.score == 95
    assert len(result.suggestions) == 1


def test_parse_review_response_with_markdown():
    """Test parsing JSON wrapped in markdown code blocks."""
    response = """```json
    {
        "success": true,
        "feedback": "Good work",
        "score": 80,
        "suggestions": []
    }
    ```"""

    result = parse_review_response(response)
    assert result.success is True
    assert result.score == 80


def test_parse_review_response_invalid_json():
    """Test parsing invalid JSON response."""
    response = "This is not valid JSON"

    result = parse_review_response(response)
    assert result.success is False
    assert "Failed to parse" in result.feedback
    assert result.score is None


def test_parse_review_response_missing_fields():
    """Test parsing JSON with missing fields."""
    response = '{"success": true}'

    result = parse_review_response(response)
    assert result.success is True
    assert result.feedback == "No feedback provided"


@pytest.mark.asyncio
async def test_review_code_with_ai_success(sample_code_extraction):
    """Test successful AI code review."""
    # Create mock provider
    mock_provider = Mock()
    mock_provider.chat = AsyncMock(
        return_value=AIResponse(
            content='{"success": true, "feedback": "Great!", "score": 90, "suggestions": []}',
            model="test-model",
        )
    )

    result = await review_code_with_ai(mock_provider, sample_code_extraction)

    assert result.success is True
    assert result.score == 90
    assert mock_provider.chat.called


@pytest.mark.asyncio
async def test_review_code_with_ai_failure(sample_code_extraction):
    """Test AI code review with failing code."""
    mock_provider = Mock()
    mock_provider.chat = AsyncMock(
        return_value=AIResponse(
            content='{"success": false, "feedback": "Missing error handling", "score": 50, "suggestions": ["Add try-except"]}',
            model="test-model",
        )
    )

    result = await review_code_with_ai(mock_provider, sample_code_extraction)

    assert result.success is False
    assert result.score == 50
    assert len(result.suggestions) == 1


@pytest.mark.asyncio
async def test_review_code_with_ai_error(sample_code_extraction):
    """Test AI code review with API error."""
    mock_provider = Mock()
    mock_provider.chat = AsyncMock(side_effect=Exception("API Error"))

    result = await review_code_with_ai(mock_provider, sample_code_extraction)

    assert result.success is False
    assert "Error during AI review" in result.feedback


def test_format_review_feedback_success():
    """Test formatting successful review feedback."""
    result = ReviewResult(
        success=True,
        feedback="Excellent code!",
        score=95.0,
        suggestions=["Add unit tests"],
    )

    formatted = format_review_feedback(result)
    assert "PASSED" in formatted
    assert "95" in formatted and "/100" in formatted
    assert "Excellent code!" in formatted
    assert "Add unit tests" in formatted


def test_format_review_feedback_failure():
    """Test formatting failed review feedback."""
    result = ReviewResult(
        success=False,
        feedback="Code has issues",
        score=45.0,
        suggestions=["Fix bug", "Improve style"],
    )

    formatted = format_review_feedback(result)
    assert "NEEDS IMPROVEMENT" in formatted
    assert "45" in formatted and "/100" in formatted
    assert "Code has issues" in formatted
    assert "Fix bug" in formatted
    assert "Improve style" in formatted


def test_format_review_feedback_no_score():
    """Test formatting feedback without score."""
    result = ReviewResult(
        success=True, feedback="Good job", score=None, suggestions=None
    )

    formatted = format_review_feedback(result)
    assert "PASSED" in formatted
    assert "Good job" in formatted
    assert "/100" not in formatted
