"""Tests for modules.json generation."""

import json
import tempfile
from pathlib import Path

import pytest

from codetandem.modules import (
    generate_modules_json,
    get_module_by_id,
    load_modules,
)


def test_generate_modules_json():
    """Test generating modules.json from curriculum."""
    curriculum_content = """# Module 1: Basics
- Learn fundamentals
- Practice basics

# Module 2: Advanced
- Master advanced concepts
"""

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        # Create curriculum file
        curriculum_file = tmp_path / "curriculum.md"
        curriculum_file.write_text(curriculum_content, encoding="utf-8")

        # Generate modules.json
        output_file = tmp_path / "modules.json"
        result = generate_modules_json(curriculum_file, output_file)

        # Check that file was created
        assert output_file.exists()

        # Check returned data
        assert "modules" in result
        assert len(result["modules"]) == 2
        assert result["modules"][0]["id"] == "module_1"
        assert result["modules"][0]["title"] == "Module 1: Basics"
        assert len(result["modules"][0]["objectives"]) == 2

        # Check file content matches
        with open(output_file, "r", encoding="utf-8") as f:
            file_data = json.load(f)

        assert file_data == result


def test_generate_modules_json_creates_directory():
    """Test that output directory is created if it doesn't exist."""
    curriculum_content = """# Module 1
- Objective 1
"""

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        curriculum_file = tmp_path / "curriculum.md"
        curriculum_file.write_text(curriculum_content, encoding="utf-8")

        # Output in a subdirectory that doesn't exist yet
        output_file = tmp_path / "output" / "modules.json"
        generate_modules_json(curriculum_file, output_file)

        assert output_file.exists()
        assert output_file.parent.exists()


def test_generate_modules_json_empty_curriculum():
    """Test that empty curriculum raises ValueError."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        curriculum_file = tmp_path / "curriculum.md"
        curriculum_file.write_text("No modules here", encoding="utf-8")

        output_file = tmp_path / "modules.json"

        with pytest.raises(ValueError, match="no modules"):
            generate_modules_json(curriculum_file, output_file)


def test_generate_modules_json_missing_curriculum():
    """Test that missing curriculum raises FileNotFoundError."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        output_file = tmp_path / "modules.json"

        with pytest.raises(FileNotFoundError):
            generate_modules_json("/nonexistent/curriculum.md", output_file)


def test_load_modules():
    """Test loading modules from modules.json."""
    modules_data = {
        "modules": [
            {
                "id": "module_1",
                "title": "Module 1",
                "objectives": ["Objective 1", "Objective 2"],
            },
            {"id": "module_2", "title": "Module 2", "objectives": ["Objective 3"]},
        ]
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        modules_file = tmp_path / "modules.json"

        with open(modules_file, "w", encoding="utf-8") as f:
            json.dump(modules_data, f)

        modules = load_modules(modules_file)

        assert len(modules) == 2
        assert modules[0].id == "module_1"
        assert modules[0].title == "Module 1"
        assert len(modules[0].objectives) == 2
        assert modules[1].id == "module_2"


def test_load_modules_missing_file():
    """Test that loading nonexistent file raises FileNotFoundError."""
    with pytest.raises(FileNotFoundError):
        load_modules("/nonexistent/modules.json")


def test_load_modules_invalid_json():
    """Test that invalid JSON structure raises ValueError."""
    invalid_data = {"wrong_key": []}

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        modules_file = tmp_path / "modules.json"

        with open(modules_file, "w", encoding="utf-8") as f:
            json.dump(invalid_data, f)

        with pytest.raises(ValueError, match="missing 'modules' key"):
            load_modules(modules_file)


def test_load_modules_without_objectives():
    """Test loading modules without objectives field."""
    modules_data = {"modules": [{"id": "module_1", "title": "Module 1"}]}

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        modules_file = tmp_path / "modules.json"

        with open(modules_file, "w", encoding="utf-8") as f:
            json.dump(modules_data, f)

        modules = load_modules(modules_file)

        assert len(modules) == 1
        assert modules[0].objectives == []


def test_get_module_by_id():
    """Test finding a module by ID."""
    modules_data = {
        "modules": [
            {"id": "mod_1", "title": "Module 1", "objectives": []},
            {"id": "mod_2", "title": "Module 2", "objectives": []},
        ]
    }

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        modules_file = tmp_path / "modules.json"

        with open(modules_file, "w", encoding="utf-8") as f:
            json.dump(modules_data, f)

        modules = load_modules(modules_file)
        module = get_module_by_id(modules, "mod_2")

        assert module.id == "mod_2"
        assert module.title == "Module 2"


def test_get_module_by_id_not_found():
    """Test that nonexistent module ID raises ValueError."""
    modules_data = {"modules": [{"id": "mod_1", "title": "Module 1", "objectives": []}]}

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        modules_file = tmp_path / "modules.json"

        with open(modules_file, "w", encoding="utf-8") as f:
            json.dump(modules_data, f)

        modules = load_modules(modules_file)

        with pytest.raises(ValueError, match="Module not found"):
            get_module_by_id(modules, "nonexistent")


def test_generate_and_load_roundtrip():
    """Test generating and then loading modules.json."""
    curriculum_content = """# Module 1
- Objective 1

# Module 2
- Objective 2
- Objective 3
"""

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        curriculum_file = tmp_path / "curriculum.md"
        curriculum_file.write_text(curriculum_content, encoding="utf-8")

        modules_file = tmp_path / "modules.json"
        generate_modules_json(curriculum_file, modules_file)

        # Load it back
        modules = load_modules(modules_file)

        assert len(modules) == 2
        assert modules[0].id == "module_1"
        assert modules[1].id == "module_2"
        assert len(modules[1].objectives) == 2
