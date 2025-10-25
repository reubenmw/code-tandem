"""Tests for base AI provider."""

import pytest

from codetandem.providers.base import AIResponse, BaseAIProvider


def test_ai_response_creation():
    """Test creating an AIResponse object."""
    response = AIResponse(
        content="Generated code",
        model="gpt-4",
        usage={"tokens": 100},
        metadata={"finish_reason": "stop"},
    )

    assert response.content == "Generated code"
    assert response.model == "gpt-4"
    assert response.usage["tokens"] == 100
    assert response.metadata["finish_reason"] == "stop"


def test_ai_response_defaults():
    """Test AIResponse with default values."""
    response = AIResponse(content="test", model="model")

    assert response.usage == {}
    assert response.metadata == {}


def test_base_provider_cannot_instantiate():
    """Test that BaseAIProvider cannot be instantiated directly."""
    with pytest.raises(TypeError):
        BaseAIProvider(api_key="test", model="test")


def test_base_provider_subclass_must_implement_methods():
    """Test that subclass must implement all abstract methods."""

    class IncompleteProvider(BaseAIProvider):
        """Provider that doesn't implement all methods."""

        pass

    with pytest.raises(TypeError):
        IncompleteProvider(api_key="test", model="test")


def test_base_provider_subclass_with_all_methods():
    """Test that subclass with all methods can be instantiated."""

    class CompleteProvider(BaseAIProvider):
        """Provider that implements all methods."""

        def generate_code_suggestion(self, prompt, context=None, temperature=0.7):
            return AIResponse(content="code", model=self.model)

        def review_code(self, code_snippet, context=None):
            return AIResponse(content="review", model=self.model)

        def chat(self, messages, temperature=0.7):
            return AIResponse(content="response", model=self.model)

    provider = CompleteProvider(api_key="test_key", model="test_model")
    assert provider.api_key == "test_key"
    assert provider.model == "test_model"


def test_base_provider_generate_code_raises_not_implemented():
    """Test that calling abstract method raises NotImplementedError."""

    class PartialProvider(BaseAIProvider):
        def review_code(self, code_snippet, context=None):
            return AIResponse(content="review", model=self.model)

        def chat(self, messages, temperature=0.7):
            return AIResponse(content="response", model=self.model)

    # Can't instantiate without implementing all methods
    with pytest.raises(TypeError):
        PartialProvider(api_key="test", model="test")


def test_build_context_prompt_empty():
    """Test building context prompt with no context."""

    class TestProvider(BaseAIProvider):
        def generate_code_suggestion(self, prompt, context=None, temperature=0.7):
            return AIResponse(content="code", model=self.model)

        def review_code(self, code_snippet, context=None):
            return AIResponse(content="review", model=self.model)

        def chat(self, messages, temperature=0.7):
            return AIResponse(content="response", model=self.model)

    provider = TestProvider(api_key="test", model="test")
    result = provider._build_context_prompt(None)
    assert result == ""

    result = provider._build_context_prompt({})
    assert result == ""


def test_build_context_prompt_with_data():
    """Test building context prompt with context data."""

    class TestProvider(BaseAIProvider):
        def generate_code_suggestion(self, prompt, context=None, temperature=0.7):
            return AIResponse(content="code", model=self.model)

        def review_code(self, code_snippet, context=None):
            return AIResponse(content="review", model=self.model)

        def chat(self, messages, temperature=0.7):
            return AIResponse(content="response", model=self.model)

    provider = TestProvider(api_key="test", model="test")

    context = {
        "file_path": "main.py",
        "language": "Python",
        "description": "Main module",
        "requirements": "Must be efficient",
    }

    result = provider._build_context_prompt(context)

    assert "File: main.py" in result
    assert "Language: Python" in result
    assert "Description: Main module" in result
    assert "Requirements: Must be efficient" in result


def test_ai_response_repr():
    """Test AIResponse string representation."""
    response = AIResponse(
        content="This is a very long generated code snippet that should be truncated",
        model="gpt-4",
    )

    repr_str = repr(response)
    assert "AIResponse" in repr_str
    assert "gpt-4" in repr_str
    assert "..." in repr_str
