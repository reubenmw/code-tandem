"""Anthropic (Claude) provider implementation."""

from typing import Dict, List, Optional

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None

from codetandem.providers.base import AIResponse, BaseAIProvider


class AnthropicProvider(BaseAIProvider):
    """Anthropic Claude API provider implementation."""

    def __init__(self, api_key: str, model: str):
        """
        Initialize Anthropic provider.

        Args:
            api_key: Anthropic API key
            model: Model name (e.g., 'claude-3-opus-20240229', 'claude-3-sonnet-20240229')
        """
        super().__init__(api_key, model)

        if Anthropic is None:
            raise ImportError(
                "anthropic package not installed. "
                "Install it with: pip install anthropic"
            )

        self.client = Anthropic(api_key=api_key)

    def generate_code_suggestion(
        self, prompt: str, context: Optional[Dict] = None, temperature: float = 0.7
    ) -> AIResponse:
        """
        Generate code suggestions using Claude.

        Args:
            prompt: The prompt describing what code to generate
            context: Optional context information
            temperature: Sampling temperature

        Returns:
            AIResponse with generated code
        """
        # Build the full prompt with context
        context_str = self._build_context_prompt(context)
        full_prompt = f"{context_str}\n\n{prompt}" if context_str else prompt

        # Call Anthropic API
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            temperature=temperature,
            system="You are an expert programmer. Generate clear, well-documented code.",
            messages=[{"role": "user", "content": full_prompt}],
        )

        # Parse response
        content = response.content[0].text
        usage = {
            "prompt_tokens": response.usage.input_tokens,
            "completion_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
        }

        return AIResponse(
            content=content,
            model=response.model,
            usage=usage,
            metadata={"stop_reason": response.stop_reason},
        )

    def review_code(
        self, code_snippet: str, context: Optional[Dict] = None
    ) -> AIResponse:
        """
        Review code using Claude.

        Args:
            code_snippet: The code to review
            context: Optional context information

        Returns:
            AIResponse with code review
        """
        context_str = self._build_context_prompt(context)

        prompt = f"{context_str}\n\n" if context_str else ""
        prompt += f"Please review the following code and provide feedback:\n\n```\n{code_snippet}\n```"

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            temperature=0.3,  # Lower temperature for reviews
            system="You are an expert code reviewer. Provide constructive, actionable feedback.",
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.content[0].text
        usage = {
            "prompt_tokens": response.usage.input_tokens,
            "completion_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
        }

        return AIResponse(
            content=content,
            model=response.model,
            usage=usage,
            metadata={"stop_reason": response.stop_reason},
        )

    def chat(
        self, messages: List[Dict[str, str]], temperature: float = 0.7
    ) -> AIResponse:
        """
        Chat with Claude.

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature

        Returns:
            AIResponse with assistant's response
        """
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            temperature=temperature,
            messages=messages,
        )

        content = response.content[0].text
        usage = {
            "prompt_tokens": response.usage.input_tokens,
            "completion_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
        }

        return AIResponse(
            content=content,
            model=response.model,
            usage=usage,
            metadata={"stop_reason": response.stop_reason},
        )
