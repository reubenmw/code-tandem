"""Tests for Gemini provider."""

from unittest.mock import Mock, patch

import pytest

from codetandem.providers.gemini import GeminiProvider


@pytest.fixture
def mock_genai():
    """Mock Google GenerativeAI."""
    with patch("codetandem.providers.gemini.genai") as mock:
        mock_model = Mock()
        mock.GenerativeModel.return_value = mock_model
        yield mock, mock_model


@pytest.fixture
def provider(mock_genai):
    """Create Gemini provider instance."""
    return GeminiProvider(api_key="test-key", model="gemini-pro")


def test_gemini_provider_init(mock_genai):
    """Test Gemini provider initialization."""
    mock_genai_module, _ = mock_genai
    provider = GeminiProvider(api_key="test-key", model="gemini-pro")

    assert provider.api_key == "test-key"
    assert provider.model == "gemini-pro"
    mock_genai_module.configure.assert_called_once_with(api_key="test-key")


def test_generate_code_suggestion(provider, mock_genai):
    """Test generating code suggestions."""
    _, mock_model = mock_genai

    # Mock response
    mock_response = Mock()
    mock_response.text = "def hello():\n    print('Hello')"
    mock_response.usage_metadata.prompt_token_count = 10
    mock_response.usage_metadata.candidates_token_count = 20
    mock_response.usage_metadata.total_token_count = 30
    mock_response.candidates = [Mock()]
    mock_response.candidates[0].finish_reason = "STOP"

    mock_model.generate_content.return_value = mock_response

    result = provider.generate_code_suggestion("Write a hello function")

    assert "def hello()" in result.content
    assert result.model == "gemini-pro"
    assert result.usage["total_tokens"] == 30

    # Verify API was called
    mock_model.generate_content.assert_called_once()


def test_review_code(provider, mock_genai):
    """Test code review."""
    _, mock_model = mock_genai

    mock_response = Mock()
    mock_response.text = "Good code, consider error handling"
    mock_response.usage_metadata.prompt_token_count = 15
    mock_response.usage_metadata.candidates_token_count = 25
    mock_response.usage_metadata.total_token_count = 40
    mock_response.candidates = [Mock()]
    mock_response.candidates[0].finish_reason = "STOP"

    mock_model.generate_content.return_value = mock_response

    code = "def add(a, b):\n    return a + b"
    result = provider.review_code(code)

    assert "error handling" in result.content
    assert result.usage["total_tokens"] == 40


def test_chat(provider, mock_genai):
    """Test chat functionality."""
    _, mock_model = mock_genai

    mock_chat = Mock()
    mock_response = Mock()
    mock_response.text = "I can help you!"
    mock_response.usage_metadata.prompt_token_count = 20
    mock_response.usage_metadata.candidates_token_count = 30
    mock_response.usage_metadata.total_token_count = 50
    mock_response.candidates = [Mock()]
    mock_response.candidates[0].finish_reason = "STOP"

    mock_chat.send_message.return_value = mock_response
    mock_chat.history = []
    mock_model.start_chat.return_value = mock_chat

    messages = [{"role": "user", "content": "Hello"}]

    result = provider.chat(messages)

    assert "help you" in result.content
    assert result.usage["total_tokens"] == 50


def test_gemini_not_installed():
    """Test error when gemini is not installed."""
    with patch("codetandem.providers.gemini.genai", None):
        with pytest.raises(
            ImportError, match="google-generativeai package not installed"
        ):
            GeminiProvider(api_key="test", model="gemini-pro")
