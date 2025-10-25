"""Tests for secure API key storage."""

from unittest.mock import Mock, patch

import pytest

from codetandem.secrets import delete_api_key, get_api_key, set_api_key, SERVICE_NAME


@pytest.fixture
def mock_keyring():
    """Mock the keyring module."""
    with patch("codetandem.secrets.keyring") as mock:
        # Keep the real errors module
        import keyring.errors

        mock.errors = keyring.errors
        yield mock


def test_set_api_key(mock_keyring):
    """Test setting an API key."""
    set_api_key("openai", "test-key-123")

    mock_keyring.set_password.assert_called_once_with(
        SERVICE_NAME, "openai_api_key", "test-key-123"
    )


def test_get_api_key(mock_keyring):
    """Test getting an API key."""
    mock_keyring.get_password.return_value = "test-key-456"

    result = get_api_key("anthropic")

    assert result == "test-key-456"
    mock_keyring.get_password.assert_called_once_with(SERVICE_NAME, "anthropic_api_key")


def test_get_api_key_not_found(mock_keyring):
    """Test getting a non-existent API key."""
    mock_keyring.get_password.return_value = None

    result = get_api_key("nonexistent")

    assert result is None


def test_delete_api_key(mock_keyring):
    """Test deleting an API key."""
    delete_api_key("openai")

    mock_keyring.delete_password.assert_called_once_with(SERVICE_NAME, "openai_api_key")


def test_delete_api_key_not_found(mock_keyring):
    """Test deleting a non-existent API key doesn't raise error."""
    import keyring.errors

    mock_keyring.delete_password.side_effect = keyring.errors.PasswordDeleteError(
        "Not found"
    )

    # Should not raise an exception
    delete_api_key("openai")
