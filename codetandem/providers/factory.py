"""Factory function for creating AI provider instances."""

from typing import Optional

from codetandem.config import get_config_manager
from codetandem.providers.base import BaseAIProvider
from codetandem.secrets import get_api_key


def get_ai_provider(
    provider_name: Optional[str] = None,
    model: Optional[str] = None,
    api_key: Optional[str] = None,
) -> BaseAIProvider:
    """
    Get an AI provider instance based on configuration.

    Args:
        provider_name: Provider name (reads from config if None)
        model: Model name (reads from config if None)
        api_key: API key (reads from secrets if None)

    Returns:
        Initialized provider instance

    Raises:
        ValueError: If provider is not configured or unsupported
    """
    # Get configuration
    config_manager = get_config_manager()

    if provider_name is None:
        provider_name = config_manager.get_provider()

    if not provider_name:
        raise ValueError(
            "No AI provider configured. "
            "Set one with: codetandem config set provider <name>"
        )

    if model is None:
        model = config_manager.get_model()

    if not model:
        raise ValueError(
            f"No model configured for provider {provider_name}. "
            f"Set one with: codetandem config set model <model>"
        )

    if api_key is None:
        api_key = get_api_key(provider_name)

    if not api_key:
        raise ValueError(
            f"No API key found for provider {provider_name}. "
            f"Set one with: codetandem config set api_key <key>"
        )

    # Import and instantiate provider
    provider_name_lower = provider_name.lower()

    if provider_name_lower == "openai":
        from codetandem.providers.openai import OpenAIProvider

        return OpenAIProvider(api_key=api_key, model=model)
    elif provider_name_lower == "gemini":
        from codetandem.providers.gemini import GeminiProvider

        return GeminiProvider(api_key=api_key, model=model)
    elif provider_name_lower in ["anthropic", "claude"]:
        from codetandem.providers.anthropic import AnthropicProvider

        return AnthropicProvider(api_key=api_key, model=model)
    else:
        raise ValueError(
            f"Unsupported provider: {provider_name}. "
            f"Supported providers: openai, gemini, anthropic"
        )
