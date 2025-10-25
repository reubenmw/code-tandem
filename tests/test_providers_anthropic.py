"""Tests for Anthropic provider."""

from unittest.mock import Mock, patch

import pytest

from codetandem.providers.anthropic import AnthropicProvider


@pytest.fixture
def mock_anthropic_client():
    """Mock Anthropic client."""
    with patch("codetandem.providers.anthropic.Anthropic") as mock_client_class:
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        yield mock_client


@pytest.fixture
def provider(mock_anthropic_client):
    """Create Anthropic provider instance."""
    return AnthropicProvider(api_key="test-key", model="claude-3-sonnet-20240229")


def test_anthropic_provider_init(mock_anthropic_client):
    """Test Anthropic provider initialization."""
    provider = AnthropicProvider(api_key="test-key", model="claude-3-sonnet-20240229")

    assert provider.api_key == "test-key"
    assert provider.model == "claude-3-sonnet-20240229"
    assert provider.client is not None


def test_generate_code_suggestion(provider, mock_anthropic_client):
    """Test generating code suggestions."""
    # Mock response
    mock_response = Mock()
    mock_response.content = [Mock()]
    mock_response.content[0].text = "def hello():\n    print('Hello')"
    mock_response.model = "claude-3-sonnet-20240229"
    mock_response.usage.input_tokens = 10
    mock_response.usage.output_tokens = 20
    mock_response.stop_reason = "end_turn"

    mock_anthropic_client.messages.create.return_value = mock_response

    result = provider.generate_code_suggestion("Write a hello function")

    assert "def hello()" in result.content
    assert result.model == "claude-3-sonnet-20240229"
    assert result.usage["total_tokens"] == 30
    assert result.metadata["stop_reason"] == "end_turn"

    # Verify API was called correctly
    mock_anthropic_client.messages.create.assert_called_once()
    call_args = mock_anthropic_client.messages.create.call_args
    assert call_args.kwargs["model"] == "claude-3-sonnet-20240229"
    assert call_args.kwargs["temperature"] == 0.7


def test_review_code(provider, mock_anthropic_client):
    """Test code review."""
    mock_response = Mock()
    mock_response.content = [Mock()]
    mock_response.content[0].text = "Good code, consider error handling"
    mock_response.model = "claude-3-sonnet-20240229"
    mock_response.usage.input_tokens = 15
    mock_response.usage.output_tokens = 25
    mock_response.stop_reason = "end_turn"

    mock_anthropic_client.messages.create.return_value = mock_response

    code = "def add(a, b):\n    return a + b"
    result = provider.review_code(code)

    assert "error handling" in result.content
    assert result.usage["total_tokens"] == 40

    # Verify temperature is lower for reviews
    call_args = mock_anthropic_client.messages.create.call_args
    assert call_args.kwargs["temperature"] == 0.3


def test_chat(provider, mock_anthropic_client):
    """Test chat functionality."""
    mock_response = Mock()
    mock_response.content = [Mock()]
    mock_response.content[0].text = "I can help you!"
    mock_response.model = "claude-3-sonnet-20240229"
    mock_response.usage.input_tokens = 20
    mock_response.usage.output_tokens = 30
    mock_response.stop_reason = "end_turn"

    mock_anthropic_client.messages.create.return_value = mock_response

    messages = [{"role": "user", "content": "Hello"}]

    result = provider.chat(messages)

    assert "help you" in result.content
    assert result.usage["total_tokens"] == 50


def test_anthropic_not_installed():
    """Test error when anthropic is not installed."""
    with patch("codetandem.providers.anthropic.Anthropic", None):
        with pytest.raises(ImportError, match="anthropic package not installed"):
            AnthropicProvider(api_key="test", model="claude-3-sonnet-20240229")
