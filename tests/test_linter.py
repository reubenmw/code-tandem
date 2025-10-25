"""Tests for linting functionality."""

import pytest
from pathlib import Path
from codetandem.linter import (
    run_linter,
    get_linter_for_file,
    format_lint_errors,
    LintError,
    LintResult,
    parse_pylint_output,
    parse_eslint_output,
)


def test_lint_error_to_dict():
    """Test LintError to_dict conversion."""
    error = LintError(
        line=10,
        column=5,
        message="Undefined variable",
        rule="undefined-variable",
        severity="error",
    )

    data = error.to_dict()
    assert data["line"] == 10
    assert data["column"] == 5
    assert data["message"] == "Undefined variable"
    assert data["rule"] == "undefined-variable"
    assert data["severity"] == "error"


def test_lint_result_to_dict():
    """Test LintResult to_dict conversion."""
    errors = [LintError(1, 1, "Error 1"), LintError(2, 2, "Error 2")]
    result = LintResult(success=False, errors=errors, output="test output")

    data = result.to_dict()
    assert data["success"] is False
    assert len(data["errors"]) == 2
    assert data["output"] == "test output"


def test_get_linter_for_python_file():
    """Test getting linter config for Python file."""
    config = get_linter_for_file("test.py")
    assert config is not None
    assert "command" in config
    assert "pylint" in str(config["command"])


def test_get_linter_for_javascript_file():
    """Test getting linter config for JavaScript file."""
    config = get_linter_for_file("test.js")
    assert config is not None
    assert "command" in config
    assert "eslint" in str(config["command"])


def test_get_linter_for_cpp_file():
    """Test getting linter config for C++ file."""
    config = get_linter_for_file("test.cpp")
    assert config is not None
    assert "command" in config


def test_get_linter_for_unknown_file():
    """Test getting linter for unsupported file type."""
    config = get_linter_for_file("test.xyz")
    assert config is None


def test_run_linter_nonexistent_file():
    """Test linter on non-existent file."""
    result = run_linter("/nonexistent/file.py")
    assert result.success is False
    assert len(result.errors) > 0
    assert "not found" in result.errors[0].message.lower()


def test_run_linter_no_linter_configured(tmp_path):
    """Test linter on file with no linter configured."""
    file_path = tmp_path / "test.xyz"
    file_path.write_text("content")

    result = run_linter(str(file_path))
    assert result.success is True
    assert len(result.errors) == 0


def test_format_lint_errors_empty():
    """Test formatting empty error list."""
    output = format_lint_errors([])
    assert "No errors found" in output


def test_format_lint_errors_with_errors():
    """Test formatting errors."""
    errors = [
        LintError(10, 5, "Error message 1", "rule-1", "error"),
        LintError(20, 10, "Error message 2", "rule-2", "warning"),
    ]

    output = format_lint_errors(errors)
    assert "Line 10" in output
    assert "Line 20" in output
    assert "Error message 1" in output
    assert "Error message 2" in output
    assert "rule-1" in output
    assert "rule-2" in output


def test_parse_pylint_output_valid():
    """Test parsing valid pylint JSON output."""
    json_output = """[
        {
            "line": 10,
            "column": 5,
            "message": "Undefined variable 'x'",
            "message-id": "E0602",
            "type": "error"
        }
    ]"""

    errors = parse_pylint_output(json_output)
    assert len(errors) == 1
    assert errors[0].line == 10
    assert errors[0].column == 5
    assert "Undefined variable" in errors[0].message


def test_parse_pylint_output_invalid():
    """Test parsing invalid pylint output."""
    errors = parse_pylint_output("not valid json")
    assert len(errors) == 0


def test_parse_eslint_output_valid():
    """Test parsing valid eslint JSON output."""
    json_output = """[
        {
            "messages": [
                {
                    "line": 5,
                    "column": 10,
                    "message": "Missing semicolon",
                    "ruleId": "semi",
                    "severity": 2
                }
            ]
        }
    ]"""

    errors = parse_eslint_output(json_output)
    assert len(errors) == 1
    assert errors[0].line == 5
    assert errors[0].message == "Missing semicolon"


def test_parse_eslint_output_invalid():
    """Test parsing invalid eslint output."""
    errors = parse_eslint_output("not valid json")
    assert len(errors) == 0


def test_run_linter_with_clean_python_file(tmp_path):
    """Test linter on clean Python file."""
    file_path = tmp_path / "clean.py"
    file_path.write_text(
        """\"\"\"Clean module.\"\"\"\n\ndef hello():\n    \"\"\"Say hello.\"\"\"\n    return \"Hello\"\n"""
    )

    result = run_linter(str(file_path), timeout=10)
    # Should either pass or report linter not found
    assert result.success is True or "not found" in result.output.lower()
