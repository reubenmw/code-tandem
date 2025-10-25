"""Tests for config CLI commands."""

import tempfile
from pathlib import Path
from unittest.mock import patch

from typer.testing import CliRunner

from codetandem.main import app
from codetandem.config import ConfigManager

runner = CliRunner()


def test_config_set_provider():
    """Test setting provider via CLI."""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("codetandem.config._config_manager", ConfigManager(Path(tmpdir))):
            result = runner.invoke(app, ["config", "set", "provider", "openai"])
            assert result.exit_code == 0
            assert "Provider set to: openai" in result.stdout


def test_config_set_model():
    """Test setting model via CLI."""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("codetandem.config._config_manager", ConfigManager(Path(tmpdir))):
            result = runner.invoke(app, ["config", "set", "model", "gpt-4"])
            assert result.exit_code == 0
            assert "Model set to: gpt-4" in result.stdout


def test_config_get_provider():
    """Test getting provider via CLI."""
    with tempfile.TemporaryDirectory() as tmpdir:
        config_manager = ConfigManager(Path(tmpdir))
        config_manager.set_provider("anthropic")

        with patch("codetandem.config._config_manager", config_manager):
            result = runner.invoke(app, ["config", "get", "provider"])
            assert result.exit_code == 0
            assert "anthropic" in result.stdout


def test_config_show():
    """Test showing all config via CLI."""
    with tempfile.TemporaryDirectory() as tmpdir:
        config_manager = ConfigManager(Path(tmpdir))
        config_manager.set_provider("openai")
        config_manager.set_model("gpt-4")

        with patch("codetandem.config._config_manager", config_manager):
            result = runner.invoke(app, ["config", "show"])
            assert result.exit_code == 0
            assert "openai" in result.stdout
            assert "gpt-4" in result.stdout


def test_config_set_api_key():
    """Test setting API key via CLI."""
    with tempfile.TemporaryDirectory() as tmpdir:
        config_manager = ConfigManager(Path(tmpdir))
        config_manager.set_provider("openai")

        with patch("codetandem.config._config_manager", config_manager):
            with patch("codetandem.commands.config.set_api_key") as mock_set:
                result = runner.invoke(app, ["config", "set", "api_key", "test-key"])
                assert result.exit_code == 0
                mock_set.assert_called_once_with("openai", "test-key")
                assert "API key securely stored" in result.stdout


def test_config_set_api_key_no_provider():
    """Test setting API key without provider fails."""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("codetandem.config._config_manager", ConfigManager(Path(tmpdir))):
            result = runner.invoke(app, ["config", "set", "api_key", "test-key"])
            assert result.exit_code == 1
            assert "No provider set" in result.stdout


def test_config_get_api_key():
    """Test getting API key via CLI."""
    with tempfile.TemporaryDirectory() as tmpdir:
        config_manager = ConfigManager(Path(tmpdir))
        config_manager.set_provider("openai")

        with patch("codetandem.config._config_manager", config_manager):
            with patch(
                "codetandem.commands.config.get_api_key", return_value="sk-test123"
            ):
                result = runner.invoke(app, ["config", "get", "api_key"])
                assert result.exit_code == 0
                assert "sk-test1..." in result.stdout


def test_config_clear_provider():
    """Test clearing provider via CLI."""
    with tempfile.TemporaryDirectory() as tmpdir:
        config_manager = ConfigManager(Path(tmpdir))
        config_manager.set_provider("openai")

        with patch("codetandem.config._config_manager", config_manager):
            result = runner.invoke(app, ["config", "clear", "provider"])
            assert result.exit_code == 0
            assert "Provider cleared" in result.stdout
