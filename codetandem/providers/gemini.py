"""Google Gemini provider implementation."""

from typing import Dict, List, Optional

try:
    import google.generativeai as genai
except ImportError:
    genai = None

from codetandem.providers.base import AIResponse, BaseAIProvider


class GeminiProvider(BaseAIProvider):
    """Google Gemini API provider implementation."""

    def __init__(self, api_key: str, model: str):
        """
        Initialize Gemini provider.

        Args:
            api_key: Google API key
            model: Model name (e.g., 'gemini-pro', 'gemini-1.5-pro')
        """
        super().__init__(api_key, model)

        if genai is None:
            raise ImportError(
                "google-generativeai package not installed. "
                "Install it with: pip install google-generativeai"
            )

        genai.configure(api_key=api_key)
        self.client = genai.GenerativeModel(model)

    def generate_code_suggestion(
        self, prompt: str, context: Optional[Dict] = None, temperature: float = 0.7
    ) -> AIResponse:
        """
        Generate code suggestions using Gemini.

        Args:
            prompt: The prompt describing what code to generate
            context: Optional context information
            temperature: Sampling temperature

        Returns:
            AIResponse with generated code
        """
        # Build the full prompt with context
        context_str = self._build_context_prompt(context)

        system_prompt = (
            "You are an expert programmer. Generate clear, well-documented code."
        )
        full_prompt = (
            f"{system_prompt}\n\n{context_str}\n\n{prompt}"
            if context_str
            else f"{system_prompt}\n\n{prompt}"
        )

        # Configure generation
        generation_config = genai.GenerationConfig(
            temperature=temperature,
        )

        # Call Gemini API
        response = self.client.generate_content(
            full_prompt, generation_config=generation_config
        )

        # Parse response
        content = response.text

        # Extract usage info if available
        usage = {}
        if hasattr(response, "usage_metadata"):
            usage = {
                "prompt_tokens": response.usage_metadata.prompt_token_count,
                "completion_tokens": response.usage_metadata.candidates_token_count,
                "total_tokens": response.usage_metadata.total_token_count,
            }

        metadata = {}
        if hasattr(response, "candidates") and response.candidates:
            metadata["finish_reason"] = str(response.candidates[0].finish_reason)

        return AIResponse(
            content=content, model=self.model, usage=usage, metadata=metadata
        )

    def review_code(
        self, code_snippet: str, context: Optional[Dict] = None
    ) -> AIResponse:
        """
        Review code using Gemini.

        Args:
            code_snippet: The code to review
            context: Optional context information

        Returns:
            AIResponse with code review
        """
        context_str = self._build_context_prompt(context)

        system_prompt = "You are an expert code reviewer. Provide constructive, actionable feedback."
        prompt = (
            f"{system_prompt}\n\n{context_str}\n\n"
            if context_str
            else f"{system_prompt}\n\n"
        )
        prompt += f"Please review the following code and provide feedback:\n\n```\n{code_snippet}\n```"

        # Lower temperature for more focused reviews
        generation_config = genai.GenerationConfig(
            temperature=0.3,
        )

        response = self.client.generate_content(
            prompt, generation_config=generation_config
        )

        content = response.text

        usage = {}
        if hasattr(response, "usage_metadata"):
            usage = {
                "prompt_tokens": response.usage_metadata.prompt_token_count,
                "completion_tokens": response.usage_metadata.candidates_token_count,
                "total_tokens": response.usage_metadata.total_token_count,
            }

        metadata = {}
        if hasattr(response, "candidates") and response.candidates:
            metadata["finish_reason"] = str(response.candidates[0].finish_reason)

        return AIResponse(
            content=content, model=self.model, usage=usage, metadata=metadata
        )

    def chat(
        self, messages: List[Dict[str, str]], temperature: float = 0.7
    ) -> AIResponse:
        """
        Chat with Gemini.

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature

        Returns:
            AIResponse with assistant's response
        """
        # Convert messages to Gemini format
        chat = self.client.start_chat(history=[])

        # Build conversation history and get last user message
        for i, msg in enumerate(messages[:-1]):
            if msg["role"] == "user":
                # Add to history by sending and receiving
                if i + 1 < len(messages) and messages[i + 1]["role"] == "assistant":
                    chat.history.append({"role": "user", "parts": [msg["content"]]})
                    chat.history.append(
                        {"role": "model", "parts": [messages[i + 1]["content"]]}
                    )

        # Get the last message (should be from user)
        last_message = messages[-1]["content"]

        generation_config = genai.GenerationConfig(
            temperature=temperature,
        )

        response = chat.send_message(last_message, generation_config=generation_config)

        content = response.text

        usage = {}
        if hasattr(response, "usage_metadata"):
            usage = {
                "prompt_tokens": response.usage_metadata.prompt_token_count,
                "completion_tokens": response.usage_metadata.candidates_token_count,
                "total_tokens": response.usage_metadata.total_token_count,
            }

        metadata = {}
        if hasattr(response, "candidates") and response.candidates:
            metadata["finish_reason"] = str(response.candidates[0].finish_reason)

        return AIResponse(
            content=content, model=self.model, usage=usage, metadata=metadata
        )
