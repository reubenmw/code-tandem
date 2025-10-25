"""Tests for tandem coding loop."""

import json
import tempfile
from pathlib import Path

import pytest

from codetandem.tandem import (
    ProjectContext,
    build_coding_prompt,
    format_module_info,
    get_next_objective_index,
    load_project_context,
)


@pytest.fixture
def sample_project():
    """Create a sample project with modules and state files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        # Create modules.json
        modules_data = {
            "modules": [
                {
                    "id": "module_1",
                    "title": "Python Basics",
                    "objectives": [
                        "Learn variables and data types",
                        "Understand control flow",
                    ],
                },
                {
                    "id": "module_2",
                    "title": "Advanced Python",
                    "objectives": ["Master classes"],
                },
            ]
        }

        with open(tmp_path / "modules.json", "w") as f:
            json.dump(modules_data, f)

        # Create state.json
        state_data = {
            "current_module_id": "module_1",
            "skill_scores": {"module_1": 0.0},
            "completed_modules": [],
            "project_tree": {"type": "directory", "name": "project", "children": []},
        }

        with open(tmp_path / "codetandem.state.json", "w") as f:
            json.dump(state_data, f)

        yield tmp_path


def test_load_project_context(sample_project):
    """Test loading project context."""
    context = load_project_context(sample_project)

    assert context.current_module_id == "module_1"
    assert context.current_module.title == "Python Basics"
    assert len(context.current_objectives) == 2
    assert context.project_path == sample_project.resolve()


def test_load_project_context_missing_modules(sample_project):
    """Test error when modules.json is missing."""
    (sample_project / "modules.json").unlink()

    with pytest.raises(FileNotFoundError, match="modules.json not found"):
        load_project_context(sample_project)


def test_load_project_context_missing_state(sample_project):
    """Test error when state file is missing."""
    (sample_project / "codetandem.state.json").unlink()

    with pytest.raises(FileNotFoundError, match="State file not found"):
        load_project_context(sample_project)


def test_load_project_context_invalid_module_id(sample_project):
    """Test error when current module ID doesn't exist."""
    # Modify state to reference non-existent module
    with open(sample_project / "codetandem.state.json", "r") as f:
        state_data = json.load(f)

    state_data["current_module_id"] = "nonexistent"

    with open(sample_project / "codetandem.state.json", "w") as f:
        json.dump(state_data, f)

    with pytest.raises(ValueError, match="not found in modules.json"):
        load_project_context(sample_project)


def test_load_project_context_nonexistent_path():
    """Test error when project path doesn't exist."""
    with pytest.raises(FileNotFoundError, match="Project path not found"):
        load_project_context("/nonexistent/path")


def test_project_context_properties(sample_project):
    """Test ProjectContext properties."""
    context = load_project_context(sample_project)

    assert context.current_module_id == "module_1"
    assert context.current_objectives == [
        "Learn variables and data types",
        "Understand control flow",
    ]
    assert context.project_tree["type"] == "directory"


def test_get_next_objective_index(sample_project):
    """Test getting next objective index."""
    context = load_project_context(sample_project)

    # Should return 0 (first objective)
    index = get_next_objective_index(context)
    assert index == 0


def test_get_next_objective_index_no_objectives():
    """Test when module has no objectives."""
    from codetandem.curriculum import Module

    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test", [])],
        current_module=Module("mod_1", "Test", []),
        project_path=Path("."),
    )

    index = get_next_objective_index(context)
    assert index is None


def test_format_module_info(sample_project):
    """Test formatting module info."""
    context = load_project_context(sample_project)

    info = format_module_info(context)

    assert "Python Basics" in info
    assert "module_1" in info
    assert "Learn variables and data types" in info
    assert "Understand control flow" in info


def test_format_module_info_no_objectives():
    """Test formatting module with no objectives."""
    from codetandem.curriculum import Module

    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test Module", [])],
        current_module=Module("mod_1", "Test Module", []),
        project_path=Path("."),
    )

    info = format_module_info(context)

    assert "Test Module" in info
    assert "mod_1" in info


def test_load_project_context_custom_filenames(sample_project):
    """Test loading with custom file names."""
    # Rename files
    (sample_project / "modules.json").rename(sample_project / "custom_modules.json")
    (sample_project / "codetandem.state.json").rename(
        sample_project / "custom_state.json"
    )

    context = load_project_context(
        sample_project,
        modules_file="custom_modules.json",
        state_file="custom_state.json",
    )

    assert context.current_module_id == "module_1"
