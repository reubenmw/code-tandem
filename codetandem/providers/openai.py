"""OpenAI provider implementation."""

from typing import Dict, List, Optional

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from codetandem.providers.base import AIResponse, BaseAIProvider


class OpenAIProvider(BaseAIProvider):
    """OpenAI API provider implementation."""

    def __init__(self, api_key: str, model: str):
        """
        Initialize OpenAI provider.

        Args:
            api_key: OpenAI API key
            model: Model name (e.g., 'gpt-4', 'gpt-3.5-turbo')
        """
        super().__init__(api_key, model)

        if OpenAI is None:
            raise ImportError(
                "openai package not installed. Install it with: pip install openai"
            )

        self.client = OpenAI(api_key=api_key)

    def generate_code_suggestion(
        self, prompt: str, context: Optional[Dict] = None, temperature: float = 0.7
    ) -> AIResponse:
        """
        Generate code suggestions using OpenAI.

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

        # Create the message
        messages = [
            {
                "role": "system",
                "content": "You are an expert programmer. Generate clear, well-documented code.",
            },
            {"role": "user", "content": full_prompt},
        ]

        # Call OpenAI API
        response = self.client.chat.completions.create(
            model=self.model, messages=messages, temperature=temperature
        )

        # Parse response
        content = response.choices[0].message.content
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        }

        return AIResponse(
            content=content,
            model=response.model,
            usage=usage,
            metadata={"finish_reason": response.choices[0].finish_reason},
        )

    def review_code(
        self, code_snippet: str, context: Optional[Dict] = None
    ) -> AIResponse:
        """
        Review code using OpenAI.

        Args:
            code_snippet: The code to review
            context: Optional context information

        Returns:
            AIResponse with code review
        """
        context_str = self._build_context_prompt(context)

        prompt = f"{context_str}\n\n" if context_str else ""
        prompt += f"Please review the following code and provide feedback:\n\n```\n{code_snippet}\n```"

        messages = [
            {
                "role": "system",
                "content": "You are an expert code reviewer. Provide constructive, actionable feedback.",
            },
            {"role": "user", "content": prompt},
        ]

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.3,  # Lower temperature for more focused reviews
        )

        content = response.choices[0].message.content
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        }

        return AIResponse(
            content=content,
            model=response.model,
            usage=usage,
            metadata={"finish_reason": response.choices[0].finish_reason},
        )

    def chat(
        self, messages: List[Dict[str, str]], temperature: float = 0.7
    ) -> AIResponse:
        """
        Chat with OpenAI.

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature

        Returns:
            AIResponse with assistant's response
        """
        response = self.client.chat.completions.create(
            model=self.model, messages=messages, temperature=temperature
        )

        content = response.choices[0].message.content
        usage = {
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        }

        return AIResponse(
            content=content,
            model=response.model,
            usage=usage,
            metadata={"finish_reason": response.choices[0].finish_reason},
        )
