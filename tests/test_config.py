"""Tests for configuration management."""

import json
import tempfile
from pathlib import Path

import pytest

from codetandem.config import ConfigManager


@pytest.fixture
def temp_config_dir():
    """Create a temporary config directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def config_manager(temp_config_dir):
    """Create a ConfigManager with temporary directory."""
    return ConfigManager(config_dir=temp_config_dir)


def test_config_dir_creation(temp_config_dir):
    """Test that config directory is created."""
    config_manager = ConfigManager(config_dir=temp_config_dir)
    assert config_manager.config_dir.exists()
    assert config_manager.config_dir.is_dir()


def test_set_and_get_config_value(config_manager):
    """Test setting and getting a config value."""
    config_manager.set_config_value("test_key", "test_value")
    assert config_manager.get_config_value("test_key") == "test_value"


def test_get_nonexistent_config_value(config_manager):
    """Test getting a non-existent config value returns None."""
    assert config_manager.get_config_value("nonexistent") is None


def test_set_provider(config_manager):
    """Test setting and getting provider."""
    config_manager.set_provider("openai")
    assert config_manager.get_provider() == "openai"


def test_set_model(config_manager):
    """Test setting and getting model."""
    config_manager.set_model("gpt-4")
    assert config_manager.get_model() == "gpt-4"


def test_config_persistence(config_manager, temp_config_dir):
    """Test that config persists across instances."""
    config_manager.set_provider("anthropic")
    config_manager.set_model("claude-3")

    # Create a new instance with the same config dir
    new_manager = ConfigManager(config_dir=temp_config_dir)
    assert new_manager.get_provider() == "anthropic"
    assert new_manager.get_model() == "claude-3"


def test_config_file_format(config_manager):
    """Test that config file is valid JSON."""
    config_manager.set_provider("openai")
    config_manager.set_model("gpt-4")

    with open(config_manager.config_file, "r") as f:
        config = json.load(f)

    assert config["provider"] == "openai"
    assert config["model"] == "gpt-4"


def test_corrupted_config_file(config_manager):
    """Test handling of corrupted config file."""
    # Write invalid JSON to config file
    with open(config_manager.config_file, "w") as f:
        f.write("invalid json{")

    # Should return None for missing keys instead of crashing
    assert config_manager.get_provider() is None

    # Should be able to set new values
    config_manager.set_provider("openai")
    assert config_manager.get_provider() == "openai"
