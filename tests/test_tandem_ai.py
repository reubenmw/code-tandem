"""Tests for AI integration and code modification."""

import json
import tempfile
from pathlib import Path
from unittest.mock import Mock

import pytest

from codetandem.curriculum import Module
from codetandem.providers.base import AIResponse
from codetandem.tandem import (
    CodeModification,
    ProjectContext,
    apply_code_modification,
    generate_code_with_ai,
    parse_code_modification,
)


def test_parse_code_modification_valid():
    """Test parsing valid JSON response."""
    response = json.dumps(
        {
            "file_path": "src/main.py",
            "code": "print('hello')\n# TODO: [mod_1] Add error handling",
            "todo_line": 2,
            "todo_task": "Add error handling",
            "explanation": "Created basic print statement",
        }
    )

    mod = parse_code_modification(response)

    assert mod.file_path == "src/main.py"
    assert "print('hello')" in mod.code
    assert mod.todo_line == 2
    assert mod.todo_task == "Add error handling"
    assert mod.explanation == "Created basic print statement"


def test_parse_code_modification_with_markdown():
    """Test parsing JSON wrapped in markdown code blocks."""
    response = (
        "```json\n"
        + json.dumps(
            {
                "file_path": "test.py",
                "code": "code",
                "todo_line": 1,
                "todo_task": "task",
                "explanation": "explanation",
            }
        )
        + "\n```"
    )

    mod = parse_code_modification(response)

    assert mod.file_path == "test.py"


def test_parse_code_modification_invalid_json():
    """Test error on invalid JSON."""
    with pytest.raises(ValueError, match="Invalid JSON"):
        parse_code_modification("not valid json{")


def test_parse_code_modification_missing_fields():
    """Test error on missing required fields."""
    response = json.dumps(
        {
            "file_path": "test.py",
            "code": "code",
            # Missing todo_line, todo_task, explanation
        }
    )

    with pytest.raises(ValueError, match="Missing required fields"):
        parse_code_modification(response)


def test_generate_code_with_ai():
    """Test generating code with AI provider."""
    # Create mock provider
    mock_provider = Mock()
    mock_response = AIResponse(
        content=json.dumps(
            {
                "file_path": "main.py",
                "code": "# TODO: [mod_1] Implement",
                "todo_line": 1,
                "todo_task": "Implement function",
                "explanation": "Added TODO",
            }
        ),
        model="test-model",
    )
    mock_provider.generate_code_suggestion.return_value = mock_response

    # Create context
    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test", ["Learn Python"])],
        current_module=Module("mod_1", "Test", ["Learn Python"]),
        project_path=Path("."),
    )

    # Generate code
    mod = generate_code_with_ai(mock_provider, context)

    assert mod.file_path == "main.py"
    assert mod.todo_task == "Implement function"

    # Verify provider was called
    mock_provider.generate_code_suggestion.assert_called_once()


def test_apply_code_modification():
    """Test applying code modification to file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        mod = CodeModification(
            file_path="src/test.py",
            code="print('hello world')",
            todo_line=1,
            todo_task="Add tests",
            explanation="Created file",
        )

        result_path = apply_code_modification(mod, tmp_path)

        assert result_path.exists()
        assert result_path.read_text() == "print('hello world')"
        assert result_path.name == "test.py"


def test_apply_code_modification_creates_directory():
    """Test that parent directories are created."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        mod = CodeModification(
            file_path="deep/nested/dir/file.py",
            code="content",
            todo_line=1,
            todo_task="task",
            explanation="explanation",
        )

        result_path = apply_code_modification(mod, tmp_path)

        assert result_path.exists()
        assert result_path.parent.name == "dir"


def test_apply_code_modification_dry_run():
    """Test dry run doesn't write files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        mod = CodeModification(
            file_path="test.py",
            code="content",
            todo_line=1,
            todo_task="task",
            explanation="explanation",
        )

        result_path = apply_code_modification(mod, tmp_path, dry_run=True)

        # Should return path but not create file
        assert not result_path.exists()


def test_code_modification_object():
    """Test CodeModification object creation."""
    mod = CodeModification(
        file_path="test.py",
        code="print('test')",
        todo_line=5,
        todo_task="Add logging",
        explanation="Basic setup",
    )

    assert mod.file_path == "test.py"
    assert mod.code == "print('test')"
    assert mod.todo_line == 5
    assert mod.todo_task == "Add logging"
    assert mod.explanation == "Basic setup"
