"""Base abstract class for AI providers."""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional


class AIResponse:
    """Standardized response from AI providers."""

    def __init__(
        self,
        content: str,
        model: str,
        usage: Optional[Dict] = None,
        metadata: Optional[Dict] = None,
    ):
        """
        Initialize AI response.

        Args:
            content: The generated content/response text
            model: Model name used for generation
            usage: Token usage information (optional)
            metadata: Additional provider-specific metadata (optional)
        """
        self.content = content
        self.model = model
        self.usage = usage or {}
        self.metadata = metadata or {}

    def __repr__(self):
        return f"AIResponse(model={self.model}, content={self.content[:50]}...)"


class BaseAIProvider(ABC):
    """Abstract base class for AI provider implementations."""

    def __init__(self, api_key: str, model: str):
        """
        Initialize the AI provider.

        Args:
            api_key: API key for authentication
            model: Model name to use
        """
        self.api_key = api_key
        self.model = model

    @abstractmethod
    def generate_code_suggestion(
        self, prompt: str, context: Optional[Dict] = None, temperature: float = 0.7
    ) -> AIResponse:
        """
        Generate code suggestions based on a prompt.

        Args:
            prompt: The prompt describing what code to generate
            context: Optional context information (file contents, etc.)
            temperature: Sampling temperature (0.0-1.0)

        Returns:
            AIResponse object containing the generated code

        Raises:
            NotImplementedError: Must be implemented by subclasses
        """
        raise NotImplementedError("Subclasses must implement generate_code_suggestion")

    @abstractmethod
    def review_code(
        self, code_snippet: str, context: Optional[Dict] = None
    ) -> AIResponse:
        """
        Review code and provide feedback.

        Args:
            code_snippet: The code to review
            context: Optional context information

        Returns:
            AIResponse object containing the review/feedback

        Raises:
            NotImplementedError: Must be implemented by subclasses
        """
        raise NotImplementedError("Subclasses must implement review_code")

    @abstractmethod
    def chat(
        self, messages: List[Dict[str, str]], temperature: float = 0.7
    ) -> AIResponse:
        """
        Have a chat conversation with the AI.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            temperature: Sampling temperature (0.0-1.0)

        Returns:
            AIResponse object containing the assistant's response

        Raises:
            NotImplementedError: Must be implemented by subclasses
        """
        raise NotImplementedError("Subclasses must implement chat")

    def _build_context_prompt(self, context: Optional[Dict]) -> str:
        """
        Build a context string from context dictionary.

        Args:
            context: Context information

        Returns:
            Formatted context string
        """
        if not context:
            return ""

        parts = []

        if "file_path" in context:
            parts.append(f"File: {context['file_path']}")

        if "language" in context:
            parts.append(f"Language: {context['language']}")

        if "description" in context:
            parts.append(f"Description: {context['description']}")

        if "requirements" in context:
            parts.append(f"Requirements: {context['requirements']}")

        return "\n".join(parts)
