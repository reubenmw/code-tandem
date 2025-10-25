"""Secure API key storage using system keyring."""

import keyring
import keyring.errors
from typing import Optional


SERVICE_NAME = "codetandem"


def set_api_key(provider: str, api_key: str):
    """
    Store an API key securely in the system keyring.

    Args:
        provider: The AI provider name (e.g., 'openai', 'anthropic')
        api_key: The API key to store
    """
    username = f"{provider}_api_key"
    keyring.set_password(SERVICE_NAME, username, api_key)


def get_api_key(provider: str) -> Optional[str]:
    """
    Retrieve an API key from the system keyring.

    Args:
        provider: The AI provider name (e.g., 'openai', 'anthropic')

    Returns:
        The API key or None if not found
    """
    username = f"{provider}_api_key"
    return keyring.get_password(SERVICE_NAME, username)


def delete_api_key(provider: str):
    """
    Delete an API key from the system keyring.

    Args:
        provider: The AI provider name (e.g., 'openai', 'anthropic')
    """
    username = f"{provider}_api_key"
    try:
        keyring.delete_password(SERVICE_NAME, username)
    except keyring.errors.PasswordDeleteError:
        # Key doesn't exist, which is fine
        pass
