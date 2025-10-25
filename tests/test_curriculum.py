"""Tests for curriculum parser."""

import tempfile
from pathlib import Path

import pytest

from codetandem.curriculum import CurriculumParser, Module, parse_curriculum


def test_module_to_dict():
    """Test Module to_dict conversion."""
    module = Module("mod_1", "Test Module", ["Objective 1", "Objective 2"])
    result = module.to_dict()

    assert result["id"] == "mod_1"
    assert result["title"] == "Test Module"
    assert result["objectives"] == ["Objective 1", "Objective 2"]


def test_parse_simple_curriculum():
    """Test parsing a simple curriculum."""
    content = """# Module 1: Introduction
- Learn the basics
- Understand core concepts

# Module 2: Advanced Topics
- Master advanced features
- Build real projects
"""

    parser = CurriculumParser()
    modules = parser.parse(content)

    assert len(modules) == 2
    assert modules[0].id == "module_1"
    assert modules[0].title == "Module 1: Introduction"
    assert len(modules[0].objectives) == 2
    assert "Learn the basics" in modules[0].objectives

    assert modules[1].id == "module_2"
    assert modules[1].title == "Module 2: Advanced Topics"
    assert len(modules[1].objectives) == 2


def test_parse_curriculum_with_h2():
    """Test that H2 headers are ignored."""
    content = """# Module 1
- Objective 1

## Section A
Some text here

- Objective 2
"""

    parser = CurriculumParser()
    modules = parser.parse(content)

    assert len(modules) == 1
    assert len(modules[0].objectives) == 2
    assert "Objective 1" in modules[0].objectives
    assert "Objective 2" in modules[0].objectives


def test_parse_empty_content():
    """Test parsing empty content."""
    parser = CurriculumParser()
    modules = parser.parse("")

    assert len(modules) == 0


def test_parse_no_modules():
    """Test parsing content with no H1 headers."""
    content = """Some text without headers
- Random list item
"""

    parser = CurriculumParser()
    modules = parser.parse(content)

    assert len(modules) == 0


def test_parse_module_without_objectives():
    """Test parsing a module without objectives."""
    content = """# Module 1
# Module 2
- Objective 1
"""

    parser = CurriculumParser()
    modules = parser.parse(content)

    assert len(modules) == 2
    assert len(modules[0].objectives) == 0
    assert len(modules[1].objectives) == 1


def test_parse_with_asterisk_list():
    """Test parsing with asterisk list markers."""
    content = """# Module 1
* Objective 1
* Objective 2
"""

    parser = CurriculumParser()
    modules = parser.parse(content)

    assert len(modules) == 1
    assert len(modules[0].objectives) == 2


def test_parse_file():
    """Test parsing from a file."""
    content = """# Module 1
- Objective 1
- Objective 2
"""

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".md", delete=False, encoding="utf-8"
    ) as f:
        f.write(content)
        temp_path = f.name

    try:
        parser = CurriculumParser()
        modules = parser.parse_file(temp_path)

        assert len(modules) == 1
        assert modules[0].title == "Module 1"
        assert len(modules[0].objectives) == 2
    finally:
        Path(temp_path).unlink()


def test_parse_file_not_found():
    """Test that parsing nonexistent file raises FileNotFoundError."""
    parser = CurriculumParser()

    with pytest.raises(FileNotFoundError):
        parser.parse_file("/nonexistent/path/curriculum.md")


def test_parse_empty_file():
    """Test that parsing empty file raises ValueError."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".md", delete=False, encoding="utf-8"
    ) as f:
        temp_path = f.name

    try:
        parser = CurriculumParser()
        with pytest.raises(ValueError, match="empty"):
            parser.parse_file(temp_path)
    finally:
        Path(temp_path).unlink()


def test_to_dict():
    """Test converting parser result to dictionary."""
    content = """# Module 1
- Objective 1

# Module 2
- Objective 2
"""

    parser = CurriculumParser()
    parser.parse(content)
    result = parser.to_dict()

    assert "modules" in result
    assert len(result["modules"]) == 2
    assert result["modules"][0]["id"] == "module_1"
    assert result["modules"][0]["title"] == "Module 1"
    assert result["modules"][0]["objectives"] == ["Objective 1"]


def test_parse_curriculum_helper_with_content():
    """Test the parse_curriculum helper function with content."""
    content = """# Module 1
- Objective 1
"""

    modules = parse_curriculum(content)
    assert len(modules) == 1
    assert modules[0].title == "Module 1"


def test_parse_curriculum_helper_with_file():
    """Test the parse_curriculum helper function with file path."""
    content = """# Module 1
- Objective 1
"""

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".md", delete=False, encoding="utf-8"
    ) as f:
        f.write(content)
        temp_path = f.name

    try:
        modules = parse_curriculum(temp_path)
        assert len(modules) == 1
        assert modules[0].title == "Module 1"
    finally:
        Path(temp_path).unlink()


def test_parse_complex_curriculum():
    """Test parsing a more complex curriculum."""
    content = """# Module 1: Python Basics
- Learn Python syntax
- Understand data types
- Work with functions

# Module 2: Object-Oriented Programming
- Define classes
- Use inheritance
- Implement polymorphism

## Advanced Concepts

- Apply design patterns

# Module 3: Web Development
- Build web applications
- Work with databases
"""

    parser = CurriculumParser()
    modules = parser.parse(content)

    assert len(modules) == 3
    assert modules[0].id == "module_1"
    assert len(modules[0].objectives) == 3
    assert modules[1].id == "module_2"
    assert len(modules[1].objectives) == 4
    assert modules[2].id == "module_3"
    assert len(modules[2].objectives) == 2
