"""
Static analysis and linting integration for code review.

This module provides functionality to run language-appropriate linters
on user code before AI review.
"""

import subprocess
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass


@dataclass
class LintError:
    """Represents a linting error."""

    line: int
    column: int
    message: str
    rule: Optional[str] = None
    severity: str = "error"

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "line": self.line,
            "column": self.column,
            "message": self.message,
            "rule": self.rule,
            "severity": self.severity,
        }


class LintResult:
    """Represents the result of running a linter."""

    def __init__(self, success: bool, errors: List[LintError], output: str = ""):
        self.success = success
        self.errors = errors
        self.output = output

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        return {
            "success": self.success,
            "errors": [e.to_dict() for e in self.errors],
            "output": self.output,
        }


# Language-specific linter configurations
LINTER_CONFIGS = {
    ".py": {
        "command": ["python", "-m", "pylint"],
        "args": ["--output-format=json"],
        "parser": "parse_pylint_output",
    },
    ".js": {
        "command": ["eslint"],
        "args": ["--format=json"],
        "parser": "parse_eslint_output",
    },
    ".ts": {
        "command": ["eslint"],
        "args": ["--format=json"],
        "parser": "parse_eslint_output",
    },
    ".cpp": {
        "command": ["clang-tidy"],
        "args": ["--format-style=file"],
        "parser": "parse_clang_tidy_output",
    },
    ".c": {
        "command": ["clang-tidy"],
        "args": ["--format-style=file"],
        "parser": "parse_clang_tidy_output",
    },
}


def parse_pylint_output(output: str) -> List[LintError]:
    """Parse pylint JSON output into LintError objects."""
    errors = []
    try:
        data = json.loads(output)
        for item in data:
            errors.append(
                LintError(
                    line=item.get("line", 0),
                    column=item.get("column", 0),
                    message=item.get("message", ""),
                    rule=item.get("message-id", ""),
                    severity=item.get("type", "error").lower(),
                )
            )
    except json.JSONDecodeError:
        pass
    return errors


def parse_eslint_output(output: str) -> List[LintError]:
    """Parse eslint JSON output into LintError objects."""
    errors = []
    try:
        data = json.loads(output)
        for file_result in data:
            for message in file_result.get("messages", []):
                errors.append(
                    LintError(
                        line=message.get("line", 0),
                        column=message.get("column", 0),
                        message=message.get("message", ""),
                        rule=message.get("ruleId", ""),
                        severity=message.get("severity", 2) == 2
                        and "error"
                        or "warning",
                    )
                )
    except json.JSONDecodeError:
        pass
    return errors


def parse_clang_tidy_output(output: str) -> List[LintError]:
    """Parse clang-tidy output into LintError objects."""
    errors = []
    # Simple regex-based parsing for clang-tidy output
    # Format: file:line:column: severity: message [rule]
    import re

    pattern = r"(\d+):(\d+):\s+(error|warning):\s+(.+?)\s+\[([^\]]+)\]"

    for match in re.finditer(pattern, output):
        line, column, severity, message, rule = match.groups()
        errors.append(
            LintError(
                line=int(line),
                column=int(column),
                message=message,
                rule=rule,
                severity=severity,
            )
        )

    return errors


def get_linter_for_file(file_path: str) -> Optional[Dict[str, Any]]:
    """
    Get the appropriate linter configuration for a file.

    Args:
        file_path: Path to the file

    Returns:
        Linter configuration dict or None if no linter available
    """
    path = Path(file_path)
    extension = path.suffix.lower()
    return LINTER_CONFIGS.get(extension)


def run_linter(file_path: str, timeout: int = 30) -> LintResult:
    """
    Run the appropriate linter on a source file.

    Args:
        file_path: Path to the source file
        timeout: Maximum time in seconds for linter to run

    Returns:
        LintResult object with success status and any errors found
    """
    path = Path(file_path)

    if not path.exists():
        return LintResult(
            success=False,
            errors=[LintError(0, 0, f"File not found: {file_path}")],
            output="",
        )

    # Get linter config
    linter_config = get_linter_for_file(file_path)

    if not linter_config:
        # No linter configured - consider this a pass
        return LintResult(success=True, errors=[], output="No linter configured")

    # Build command
    command = linter_config["command"] + linter_config["args"] + [str(path)]

    try:
        result = subprocess.run(
            command, capture_output=True, text=True, timeout=timeout, cwd=path.parent
        )

        output = result.stdout or result.stderr

        # Parse output using the configured parser
        parser_name = linter_config["parser"]
        parser = globals().get(parser_name)

        if parser:
            errors = parser(output)
        else:
            errors = []

        # Consider it successful if no errors (warnings are OK)
        success = all(e.severity != "error" for e in errors)

        return LintResult(success=success, errors=errors, output=output)

    except subprocess.TimeoutExpired:
        return LintResult(
            success=False,
            errors=[LintError(0, 0, f"Linter timed out after {timeout} seconds")],
            output="",
        )
    except FileNotFoundError:
        # Linter not installed
        linter_name = linter_config["command"][0]
        return LintResult(
            success=True,  # Don't fail if linter not installed
            errors=[],
            output=f"Linter '{linter_name}' not found - skipping static analysis",
        )
    except Exception as e:
        return LintResult(
            success=False,
            errors=[LintError(0, 0, f"Linter error: {str(e)}")],
            output="",
        )


def format_lint_errors(errors: List[LintError]) -> str:
    """
    Format lint errors for display to user.

    Args:
        errors: List of LintError objects

    Returns:
        Formatted error message string
    """
    if not errors:
        return "No errors found."

    lines = []
    for error in errors:
        location = f"Line {error.line}, Column {error.column}"
        rule_info = f" [{error.rule}]" if error.rule else ""
        lines.append(f"{location}: {error.severity.upper()}{rule_info}")
        lines.append(f"  {error.message}")
        lines.append("")

    return "\n".join(lines)
