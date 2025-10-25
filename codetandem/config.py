"""Configuration management for CodeTandem."""

import json
import os
from pathlib import Path
from typing import Any, Optional


class ConfigManager:
    """Manages application configuration."""

    def __init__(self, config_dir: Optional[Path] = None):
        """
        Initialize the configuration manager.

        Args:
            config_dir: Custom config directory path. If None, uses ~/.config/codetandem
        """
        if config_dir is None:
            config_dir = Path.home() / ".config" / "codetandem"

        self.config_dir = config_dir
        self.config_file = self.config_dir / "config.json"
        self._ensure_config_dir()

    def _ensure_config_dir(self):
        """Create config directory if it doesn't exist."""
        self.config_dir.mkdir(parents=True, exist_ok=True)

    def _load_config(self) -> dict:
        """Load configuration from file."""
        if not self.config_file.exists():
            return {}

        try:
            with open(self.config_file, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}

    def _save_config(self, config: dict):
        """Save configuration to file."""
        with open(self.config_file, "w") as f:
            json.dump(config, f, indent=2)

    def get_config_value(self, key: str) -> Optional[Any]:
        """
        Get a configuration value.

        Args:
            key: Configuration key to retrieve

        Returns:
            The configuration value or None if not found
        """
        config = self._load_config()
        return config.get(key)

    def set_config_value(self, key: str, value: Any):
        """
        Set a configuration value.

        Args:
            key: Configuration key to set
            value: Value to store
        """
        config = self._load_config()
        config[key] = value
        self._save_config(config)

    def get_provider(self) -> Optional[str]:
        """Get the configured AI provider."""
        return self.get_config_value("provider")

    def set_provider(self, provider: str):
        """Set the AI provider."""
        self.set_config_value("provider", provider)

    def get_model(self) -> Optional[str]:
        """Get the configured model name."""
        return self.get_config_value("model")

    def set_model(self, model: str):
        """Set the model name."""
        self.set_config_value("model", model)


# Global instance
_config_manager: Optional[ConfigManager] = None


def get_config_manager() -> ConfigManager:
    """Get the global configuration manager instance."""
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager()
    return _config_manager
