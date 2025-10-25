"""Markdown curriculum parser."""

import re
from pathlib import Path
from typing import Dict, List, Optional, Union


class Module:
    """Represents a learning module."""

    def __init__(self, id: str, title: str, objectives: List[str] = None):
        self.id = id
        self.title = title
        self.objectives = objectives or []

    def to_dict(self) -> Dict:
        """Convert module to dictionary."""
        return {"id": self.id, "title": self.title, "objectives": self.objectives}


class CurriculumParser:
    """Parser for Markdown curriculum files."""

    def __init__(self):
        self.modules: List[Module] = []

    def parse(self, content: str) -> List[Module]:
        """
        Parse curriculum from Markdown content.

        Expected format:
        # Module Title
        - Objective 1
        - Objective 2

        ## Optional subheadings (ignored in objectives)

        Args:
            content: Markdown content to parse

        Returns:
            List of Module objects
        """
        self.modules = []
        lines = content.split("\n")

        current_module: Optional[Module] = None
        module_counter = 1

        for line in lines:
            line = line.rstrip()

            # Skip empty lines
            if not line:
                continue

            # H1 headers are module titles
            if line.startswith("# "):
                # Save previous module if exists
                if current_module:
                    self.modules.append(current_module)

                title = line[2:].strip()
                module_id = f"module_{module_counter}"
                current_module = Module(module_id, title)
                module_counter += 1

            # H2 headers are ignored (can be used for sections)
            elif line.startswith("## "):
                continue

            # List items under H1 are objectives
            elif line.startswith("- ") or line.startswith("* "):
                if current_module:
                    objective = line[2:].strip()
                    if objective:  # Only add non-empty objectives
                        current_module.objectives.append(objective)

        # Add the last module
        if current_module:
            self.modules.append(current_module)

        return self.modules

    def parse_file(self, file_path: Union[str, Path]) -> List[Module]:
        """
        Parse curriculum from a Markdown file.

        Args:
            file_path: Path to the Markdown file

        Returns:
            List of Module objects

        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If file is empty
        """
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"Curriculum file not found: {file_path}")

        content = path.read_text(encoding="utf-8")

        if not content.strip():
            raise ValueError(f"Curriculum file is empty: {file_path}")

        return self.parse(content)

    def to_dict(self) -> Dict:
        """
        Convert parsed curriculum to dictionary format.

        Returns:
            Dictionary with modules list
        """
        return {"modules": [module.to_dict() for module in self.modules]}


def parse_curriculum(content_or_path: Union[str, Path]) -> List[Module]:
    """
    Parse curriculum from Markdown content or file.

    Args:
        content_or_path: Either Markdown content string or path to file

    Returns:
        List of Module objects
    """
    parser = CurriculumParser()

    # Check if it's a path
    if isinstance(content_or_path, Path) or (
        isinstance(content_or_path, str)
        and "\n" not in content_or_path
        and len(content_or_path) < 260
    ):
        # Likely a file path
        try:
            return parser.parse_file(content_or_path)
        except (FileNotFoundError, OSError):
            # If file doesn't exist, treat as content
            pass

    # Treat as content
    return parser.parse(str(content_or_path))
