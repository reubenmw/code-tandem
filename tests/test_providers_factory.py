"""Tests for AI provider factory."""

import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from codetandem.config import ConfigManager
from codetandem.providers.factory import get_ai_provider
from codetandem.providers.openai import OpenAIProvider
from codetandem.providers.gemini import GeminiProvider
from codetandem.providers.anthropic import AnthropicProvider


@pytest.fixture
def temp_config():
    """Create temporary config for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        config_manager = ConfigManager(Path(tmpdir))
        with patch(
            "codetandem.providers.factory.get_config_manager",
            return_value=config_manager,
        ):
            yield config_manager


def test_get_ai_provider_openai(temp_config):
    """Test getting OpenAI provider from factory."""
    temp_config.set_provider("openai")
    temp_config.set_model("gpt-4")

    with patch("codetandem.providers.factory.get_api_key", return_value="test-key"):
        with patch("codetandem.providers.openai.OpenAI"):
            provider = get_ai_provider()

            assert isinstance(provider, OpenAIProvider)
            assert provider.api_key == "test-key"
            assert provider.model == "gpt-4"


def test_get_ai_provider_gemini(temp_config):
    """Test getting Gemini provider from factory."""
    temp_config.set_provider("gemini")
    temp_config.set_model("gemini-pro")

    with patch("codetandem.providers.factory.get_api_key", return_value="test-key"):
        with patch("codetandem.providers.gemini.genai"):
            provider = get_ai_provider()

            assert isinstance(provider, GeminiProvider)
            assert provider.api_key == "test-key"
            assert provider.model == "gemini-pro"


def test_get_ai_provider_anthropic(temp_config):
    """Test getting Anthropic provider from factory."""
    temp_config.set_provider("anthropic")
    temp_config.set_model("claude-3-sonnet-20240229")

    with patch("codetandem.providers.factory.get_api_key", return_value="test-key"):
        with patch("codetandem.providers.anthropic.Anthropic"):
            provider = get_ai_provider()

            assert isinstance(provider, AnthropicProvider)
            assert provider.api_key == "test-key"
            assert provider.model == "claude-3-sonnet-20240229"


def test_get_ai_provider_claude_alias(temp_config):
    """Test that 'claude' works as alias for anthropic."""
    temp_config.set_provider("claude")
    temp_config.set_model("claude-3-sonnet-20240229")

    with patch("codetandem.providers.factory.get_api_key", return_value="test-key"):
        with patch("codetandem.providers.anthropic.Anthropic"):
            provider = get_ai_provider()

            assert isinstance(provider, AnthropicProvider)


def test_get_ai_provider_with_explicit_params(temp_config):
    """Test providing explicit parameters to factory."""
    with patch("codetandem.providers.openai.OpenAI"):
        provider = get_ai_provider(
            provider_name="openai", model="gpt-3.5-turbo", api_key="explicit-key"
        )

        assert isinstance(provider, OpenAIProvider)
        assert provider.api_key == "explicit-key"
        assert provider.model == "gpt-3.5-turbo"


def test_get_ai_provider_no_provider_configured(temp_config):
    """Test error when no provider is configured."""
    with pytest.raises(ValueError, match="No AI provider configured"):
        get_ai_provider()


def test_get_ai_provider_no_model_configured(temp_config):
    """Test error when no model is configured."""
    temp_config.set_provider("openai")

    with pytest.raises(ValueError, match="No model configured"):
        get_ai_provider()


def test_get_ai_provider_no_api_key(temp_config):
    """Test error when no API key is found."""
    temp_config.set_provider("openai")
    temp_config.set_model("gpt-4")

    with patch("codetandem.providers.factory.get_api_key", return_value=None):
        with pytest.raises(ValueError, match="No API key found"):
            get_ai_provider()


def test_get_ai_provider_unsupported_provider(temp_config):
    """Test error with unsupported provider."""
    temp_config.set_provider("unsupported")
    temp_config.set_model("some-model")

    with patch("codetandem.providers.factory.get_api_key", return_value="test-key"):
        with pytest.raises(ValueError, match="Unsupported provider"):
            get_ai_provider()


def test_get_ai_provider_case_insensitive(temp_config):
    """Test that provider names are case-insensitive."""
    temp_config.set_provider("OpenAI")
    temp_config.set_model("gpt-4")

    with patch("codetandem.providers.factory.get_api_key", return_value="test-key"):
        with patch("codetandem.providers.openai.OpenAI"):
            provider = get_ai_provider()

            assert isinstance(provider, OpenAIProvider)


def test_get_ai_provider_partial_override(temp_config):
    """Test overriding only some parameters."""
    temp_config.set_provider("openai")
    temp_config.set_model("gpt-4")

    with patch("codetandem.providers.factory.get_api_key", return_value="config-key"):
        with patch("codetandem.providers.openai.OpenAI"):
            # Override only the model
            provider = get_ai_provider(model="gpt-3.5-turbo")

            assert provider.model == "gpt-3.5-turbo"
            assert provider.api_key == "config-key"
