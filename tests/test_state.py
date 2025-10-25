"""Tests for state management."""

import json
import tempfile
from pathlib import Path

import pytest

from codetandem.state import (
    generate_initial_state,
    get_current_module_id,
    get_skill_score,
    is_module_completed,
    load_state,
    update_state,
    increment_skill_score,
)


@pytest.fixture
def sample_modules_file():
    """Create a sample modules.json file."""
    modules_data = {
        "modules": [
            {"id": "module_1", "title": "Module 1", "objectives": ["Obj 1"]},
            {"id": "module_2", "title": "Module 2", "objectives": ["Obj 2"]},
        ]
    }

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    ) as f:
        json.dump(modules_data, f)
        temp_path = f.name

    yield temp_path
    Path(temp_path).unlink()


@pytest.fixture
def sample_project_dir():
    """Create a sample project directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        (tmp_path / "file1.txt").write_text("content")
        (tmp_path / "src").mkdir()
        (tmp_path / "src" / "main.py").write_text("code")
        yield tmp_path


def test_generate_initial_state(sample_modules_file, sample_project_dir):
    """Test generating initial state file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        output_file = Path(tmpdir) / "state.json"

        result = generate_initial_state(
            sample_modules_file, sample_project_dir, output_file
        )

        # Check file was created
        assert output_file.exists()

        # Check returned data structure
        assert result["version"] == "1.0"
        assert result["current_module_id"] == "module_1"
        assert result["skill_scores"]["module_1"] == 0.0
        assert result["completed_modules"] == []
        assert "project_tree" in result
        assert result["project_tree"]["type"] == "directory"
        assert "created_at" in result
        assert "updated_at" in result
        assert result["metadata"]["total_modules"] == 2


def test_generate_initial_state_custom_skill_score(
    sample_modules_file, sample_project_dir
):
    """Test generating initial state with custom skill score."""
    with tempfile.TemporaryDirectory() as tmpdir:
        output_file = Path(tmpdir) / "state.json"

        result = generate_initial_state(
            sample_modules_file,
            sample_project_dir,
            output_file,
            initial_skill_score=0.5,
        )

        assert result["skill_scores"]["module_1"] == 0.5


def test_generate_initial_state_creates_directory(
    sample_modules_file, sample_project_dir
):
    """Test that output directory is created if needed."""
    with tempfile.TemporaryDirectory() as tmpdir:
        output_file = Path(tmpdir) / "output" / "state.json"

        generate_initial_state(sample_modules_file, sample_project_dir, output_file)

        assert output_file.exists()
        assert output_file.parent.exists()


def test_generate_initial_state_missing_modules_file(sample_project_dir):
    """Test that missing modules.json raises FileNotFoundError."""
    with tempfile.TemporaryDirectory() as tmpdir:
        output_file = Path(tmpdir) / "state.json"

        with pytest.raises(FileNotFoundError):
            generate_initial_state(
                "/nonexistent/modules.json", sample_project_dir, output_file
            )


def test_generate_initial_state_missing_project_dir(sample_modules_file):
    """Test that missing project directory raises ValueError."""
    with tempfile.TemporaryDirectory() as tmpdir:
        output_file = Path(tmpdir) / "state.json"

        with pytest.raises(ValueError):
            generate_initial_state(
                sample_modules_file, "/nonexistent/project", output_file
            )


def test_load_state():
    """Test loading state from file."""
    state_data = {
        "version": "1.0",
        "current_module_id": "module_2",
        "skill_scores": {"module_1": 1.0, "module_2": 0.5},
        "completed_modules": ["module_1"],
        "project_tree": {"type": "directory", "name": "test", "children": []},
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        state_file = Path(tmpdir) / "state.json"

        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state_data, f)

        loaded = load_state(state_file)

        assert loaded["current_module_id"] == "module_2"
        assert loaded["skill_scores"]["module_1"] == 1.0
        assert "module_1" in loaded["completed_modules"]


def test_load_state_missing_file():
    """Test that loading nonexistent file raises FileNotFoundError."""
    with pytest.raises(FileNotFoundError):
        load_state("/nonexistent/state.json")


def test_load_state_invalid_structure():
    """Test that invalid state structure raises ValueError."""
    invalid_data = {"version": "1.0"}

    with tempfile.TemporaryDirectory() as tmpdir:
        state_file = Path(tmpdir) / "state.json"

        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(invalid_data, f)

        with pytest.raises(ValueError, match="missing"):
            load_state(state_file)


def test_update_state_current_module():
    """Test updating current module."""
    state_data = {
        "current_module_id": "module_1",
        "skill_scores": {"module_1": 0.5},
        "completed_modules": [],
        "updated_at": "2024-01-01T00:00:00Z",
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        state_file = Path(tmpdir) / "state.json"

        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state_data, f)

        updated = update_state(state_file, current_module_id="module_2")

        assert updated["current_module_id"] == "module_2"
        assert updated["updated_at"] != "2024-01-01T00:00:00Z"


def test_update_state_skill_score():
    """Test updating skill score."""
    state_data = {
        "current_module_id": "module_1",
        "skill_scores": {"module_1": 0.5},
        "completed_modules": [],
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        state_file = Path(tmpdir) / "state.json"

        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state_data, f)

        updated = update_state(state_file, skill_score=0.8)

        assert updated["skill_scores"]["module_1"] == 0.8


def test_update_state_complete_module():
    """Test marking a module as completed."""
    state_data = {
        "current_module_id": "module_1",
        "skill_scores": {"module_1": 0.5},
        "completed_modules": [],
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        state_file = Path(tmpdir) / "state.json"

        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state_data, f)

        updated = update_state(state_file, completed_module_id="module_1")

        assert "module_1" in updated["completed_modules"]


def test_update_state_project_tree():
    """Test updating project tree."""
    state_data = {
        "current_module_id": "module_1",
        "skill_scores": {"module_1": 0.5},
        "completed_modules": [],
        "project_tree": {"type": "directory", "name": "old", "children": []},
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        state_file = Path(tmpdir) / "state.json"

        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state_data, f)

        new_tree = {"type": "directory", "name": "new", "children": []}
        updated = update_state(state_file, project_tree=new_tree)

        assert updated["project_tree"]["name"] == "new"


def test_get_current_module_id():
    """Test getting current module ID."""
    state = {"current_module_id": "module_3"}
    assert get_current_module_id(state) == "module_3"


def test_get_skill_score():
    """Test getting skill score."""
    state = {"skill_scores": {"module_1": 0.7, "module_2": 0.3}}
    assert get_skill_score(state, "module_1") == 0.7
    assert get_skill_score(state, "module_2") == 0.3
    assert get_skill_score(state, "module_3") == 0.0  # Default


def test_is_module_completed():
    """Test checking if module is completed."""
    state = {"completed_modules": ["module_1", "module_2"]}
    assert is_module_completed(state, "module_1") is True
    assert is_module_completed(state, "module_2") is True
    assert is_module_completed(state, "module_3") is False


def test_increment_skill_score():
    """Test incrementing skill score."""
    state_data = {
        "version": "1.0",
        "current_module_id": "module_1",
        "skill_scores": {"module_1": 10.0, "module_2": 5.0},
        "completed_modules": [],
        "project_tree": {"type": "directory", "name": "test", "children": []},
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        state_file = Path(tmpdir) / "state.json"

        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state_data, f)

        # Increment module_1 score by 15 points
        new_score = increment_skill_score(state_file, "module_1", 15.0)
        assert new_score == 25.0

        # Verify it was saved
        loaded = load_state(state_file)
        assert loaded["skill_scores"]["module_1"] == 25.0
        assert loaded["skill_scores"]["module_2"] == 5.0  # Unchanged


def test_increment_skill_score_new_module():
    """Test incrementing skill score for module with no previous score."""
    state_data = {
        "version": "1.0",
        "current_module_id": "module_1",
        "skill_scores": {"module_1": 10.0},
        "completed_modules": [],
        "project_tree": {"type": "directory", "name": "test", "children": []},
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        state_file = Path(tmpdir) / "state.json"

        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state_data, f)

        # Increment score for module_2 which doesn't exist yet
        new_score = increment_skill_score(state_file, "module_2", 20.0)
        assert new_score == 20.0

        # Verify it was saved
        loaded = load_state(state_file)
        assert loaded["skill_scores"]["module_2"] == 20.0
