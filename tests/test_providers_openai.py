"""Tests for OpenAI provider."""

from unittest.mock import Mock, patch

import pytest

from codetandem.providers.openai import OpenAIProvider


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client."""
    with patch("codetandem.providers.openai.OpenAI") as mock_client_class:
        mock_client = Mock()
        mock_client_class.return_value = mock_client
        yield mock_client


@pytest.fixture
def provider(mock_openai_client):
    """Create OpenAI provider instance."""
    return OpenAIProvider(api_key="test-key", model="gpt-4")


def test_openai_provider_init(mock_openai_client):
    """Test OpenAI provider initialization."""
    provider = OpenAIProvider(api_key="test-key", model="gpt-4")

    assert provider.api_key == "test-key"
    assert provider.model == "gpt-4"
    assert provider.client is not None


def test_generate_code_suggestion(provider, mock_openai_client):
    """Test generating code suggestions."""
    # Mock the response
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "def hello():\n    print('Hello')"
    mock_response.choices[0].finish_reason = "stop"
    mock_response.model = "gpt-4"
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 20
    mock_response.usage.total_tokens = 30

    mock_openai_client.chat.completions.create.return_value = mock_response

    result = provider.generate_code_suggestion("Write a hello function")

    assert "def hello()" in result.content
    assert result.model == "gpt-4"
    assert result.usage["total_tokens"] == 30
    assert result.metadata["finish_reason"] == "stop"

    # Verify API was called correctly
    mock_openai_client.chat.completions.create.assert_called_once()
    call_args = mock_openai_client.chat.completions.create.call_args
    assert call_args.kwargs["model"] == "gpt-4"
    assert call_args.kwargs["temperature"] == 0.7
    assert len(call_args.kwargs["messages"]) == 2


def test_generate_code_suggestion_with_context(provider, mock_openai_client):
    """Test generating code with context."""
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "code"
    mock_response.choices[0].finish_reason = "stop"
    mock_response.model = "gpt-4"
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 20
    mock_response.usage.total_tokens = 30

    mock_openai_client.chat.completions.create.return_value = mock_response

    context = {"file_path": "main.py", "language": "Python"}

    result = provider.generate_code_suggestion("Write code", context=context)

    # Check that context was included in the prompt
    call_args = mock_openai_client.chat.completions.create.call_args
    user_message = call_args.kwargs["messages"][1]["content"]
    assert "main.py" in user_message
    assert "Python" in user_message


def test_review_code(provider, mock_openai_client):
    """Test code review."""
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[
        0
    ].message.content = "Good code, but consider adding error handling"
    mock_response.choices[0].finish_reason = "stop"
    mock_response.model = "gpt-4"
    mock_response.usage.prompt_tokens = 15
    mock_response.usage.completion_tokens = 25
    mock_response.usage.total_tokens = 40

    mock_openai_client.chat.completions.create.return_value = mock_response

    code = "def add(a, b):\n    return a + b"
    result = provider.review_code(code)

    assert "error handling" in result.content
    assert result.usage["total_tokens"] == 40

    # Verify temperature is lower for reviews
    call_args = mock_openai_client.chat.completions.create.call_args
    assert call_args.kwargs["temperature"] == 0.3


def test_review_code_with_context(provider, mock_openai_client):
    """Test code review with context."""
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "Review feedback"
    mock_response.choices[0].finish_reason = "stop"
    mock_response.model = "gpt-4"
    mock_response.usage.prompt_tokens = 15
    mock_response.usage.completion_tokens = 25
    mock_response.usage.total_tokens = 40

    mock_openai_client.chat.completions.create.return_value = mock_response

    context = {"file_path": "utils.py"}
    result = provider.review_code("code", context=context)

    # Check context was included
    call_args = mock_openai_client.chat.completions.create.call_args
    user_message = call_args.kwargs["messages"][1]["content"]
    assert "utils.py" in user_message


def test_chat(provider, mock_openai_client):
    """Test chat functionality."""
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "I can help you with that!"
    mock_response.choices[0].finish_reason = "stop"
    mock_response.model = "gpt-4"
    mock_response.usage.prompt_tokens = 20
    mock_response.usage.completion_tokens = 30
    mock_response.usage.total_tokens = 50

    mock_openai_client.chat.completions.create.return_value = mock_response

    messages = [{"role": "user", "content": "Hello"}]

    result = provider.chat(messages)

    assert "help you" in result.content
    assert result.usage["total_tokens"] == 50

    # Verify messages were passed correctly
    call_args = mock_openai_client.chat.completions.create.call_args
    assert call_args.kwargs["messages"] == messages


def test_chat_with_temperature(provider, mock_openai_client):
    """Test chat with custom temperature."""
    mock_response = Mock()
    mock_response.choices = [Mock()]
    mock_response.choices[0].message.content = "Response"
    mock_response.choices[0].finish_reason = "stop"
    mock_response.model = "gpt-4"
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 10
    mock_response.usage.total_tokens = 20

    mock_openai_client.chat.completions.create.return_value = mock_response

    messages = [{"role": "user", "content": "Test"}]
    result = provider.chat(messages, temperature=0.2)

    call_args = mock_openai_client.chat.completions.create.call_args
    assert call_args.kwargs["temperature"] == 0.2


def test_openai_not_installed():
    """Test error when openai is not installed."""
    with patch("codetandem.providers.openai.OpenAI", None):
        with pytest.raises(ImportError, match="openai package not installed"):
            OpenAIProvider(api_key="test", model="gpt-4")
