"""Tests for Taskmaster integration functionality."""

import pytest
import json
from pathlib import Path
from codetandem.taskmaster_integration import (
    TaskmasterTask,
    PRDSection,
    TaskmasterParser,
    PRDParser,
    create_curriculum_backlog_mapping,
)


@pytest.fixture
def sample_tasks_json(tmp_path):
    """Create a sample tasks.json file."""
    tasks_data = {
        "tasks": [
            {
                "id": "1",
                "title": "Setup CLI framework",
                "description": "Implement basic CLI structure with Typer",
                "dependencies": [],
                "status": "done",
                "priority": "high",
                "tags": ["cli", "setup"],
            },
            {
                "id": "2",
                "title": "Add configuration management",
                "description": "Create config system for API keys",
                "dependencies": ["1"],
                "status": "pending",
                "priority": "medium",
                "tags": ["config", "setup"],
            },
            {
                "id": "3",
                "title": "Implement code review",
                "description": "Build AI-powered code review feature",
                "dependencies": ["2"],
                "status": "pending",
                "tags": ["ai", "review"],
            },
        ]
    }

    file_path = tmp_path / "tasks.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(tasks_data, f)

    return file_path


@pytest.fixture
def sample_tasks_array_json(tmp_path):
    """Create a tasks.json file with array format."""
    tasks_data = [
        {
            "id": "1",
            "title": "Task 1",
            "description": "Description 1",
            "dependencies": [],
            "status": "pending",
        }
    ]

    file_path = tmp_path / "tasks_array.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(tasks_data, f)

    return file_path


@pytest.fixture
def sample_prd_md(tmp_path):
    """Create a sample prd.md file."""
    prd_content = """# Project Overview

This is the main project description.

## CLI Framework

Build a command-line interface using modern Python tools.

- Create basic CLI structure
- Add help documentation
- Implement subcommands

## Configuration System

Implement configuration management for the application.

- Store API keys securely
- Manage user preferences
- Support multiple profiles

### Advanced Config

Nested section for advanced configuration.

## AI Integration

Add artificial intelligence capabilities.

- Integrate with OpenAI API
- Build code review system
- Generate suggestions
"""

    file_path = tmp_path / "prd.md"
    file_path.write_text(prd_content, encoding="utf-8")

    return file_path


def test_taskmaster_task_to_dict():
    """Test TaskmasterTask to_dict conversion."""
    task = TaskmasterTask(
        id="1",
        title="Test Task",
        description="Test description",
        dependencies=["2"],
        status="pending",
        priority="high",
        tags=["test"],
    )

    data = task.to_dict()
    assert data["id"] == "1"
    assert data["title"] == "Test Task"
    assert data["dependencies"] == ["2"]
    assert data["tags"] == ["test"]


def test_prd_section_to_dict():
    """Test PRDSection to_dict conversion."""
    section = PRDSection(
        title="Test Section",
        content="Content here",
        level=1,
        objectives=["Objective 1", "Objective 2"],
    )

    data = section.to_dict()
    assert data["title"] == "Test Section"
    assert data["level"] == 1
    assert len(data["objectives"]) == 2


def test_taskmaster_parser_parse_tasks(sample_tasks_json):
    """Test parsing tasks.json."""
    parser = TaskmasterParser()
    tasks = parser.parse_tasks_json(sample_tasks_json)

    assert len(tasks) == 3
    assert tasks[0].id == "1"
    assert tasks[0].title == "Setup CLI framework"
    assert tasks[0].status == "done"
    assert "cli" in tasks[0].tags


def test_taskmaster_parser_array_format(sample_tasks_array_json):
    """Test parsing tasks.json in array format."""
    parser = TaskmasterParser()
    tasks = parser.parse_tasks_json(sample_tasks_array_json)

    assert len(tasks) == 1
    assert tasks[0].id == "1"


def test_taskmaster_parser_missing_file():
    """Test parsing non-existent file."""
    parser = TaskmasterParser()

    with pytest.raises(FileNotFoundError):
        parser.parse_tasks_json("/nonexistent/tasks.json")


def test_taskmaster_parser_invalid_json(tmp_path):
    """Test parsing invalid JSON."""
    file_path = tmp_path / "invalid.json"
    file_path.write_text("not valid json")

    parser = TaskmasterParser()

    with pytest.raises(json.JSONDecodeError):
        parser.parse_tasks_json(file_path)


def test_taskmaster_parser_missing_id(tmp_path):
    """Test parsing task without id field."""
    tasks_data = {"tasks": [{"title": "No ID"}]}
    file_path = tmp_path / "no_id.json"
    with open(file_path, "w") as f:
        json.dump(tasks_data, f)

    parser = TaskmasterParser()

    with pytest.raises(ValueError):
        parser.parse_tasks_json(file_path)


def test_filter_tasks_by_status(sample_tasks_json):
    """Test filtering tasks by status."""
    parser = TaskmasterParser()
    tasks = parser.parse_tasks_json(sample_tasks_json)

    done_tasks = parser.filter_tasks(tasks, status="done")
    assert len(done_tasks) == 1
    assert done_tasks[0].status == "done"

    pending_tasks = parser.filter_tasks(tasks, status="pending")
    assert len(pending_tasks) == 2


def test_filter_tasks_by_priority(sample_tasks_json):
    """Test filtering tasks by priority."""
    parser = TaskmasterParser()
    tasks = parser.parse_tasks_json(sample_tasks_json)

    high_priority = parser.filter_tasks(tasks, priority="high")
    assert len(high_priority) == 1
    assert high_priority[0].priority == "high"


def test_filter_tasks_by_tags(sample_tasks_json):
    """Test filtering tasks by tags."""
    parser = TaskmasterParser()
    tasks = parser.parse_tasks_json(sample_tasks_json)

    cli_tasks = parser.filter_tasks(tasks, tags=["cli"])
    assert len(cli_tasks) >= 1
    assert any("cli" in t.tags for t in cli_tasks)

    setup_tasks = parser.filter_tasks(tasks, tags=["setup"])
    assert len(setup_tasks) >= 2


def test_prd_parser_parse_prd(sample_prd_md):
    """Test parsing PRD markdown."""
    parser = PRDParser()
    sections = parser.parse_prd(sample_prd_md)

    assert len(sections) > 0

    # Check for main sections
    titles = [s.title for s in sections]
    assert "Project Overview" in titles
    assert "CLI Framework" in titles
    assert "Configuration System" in titles


def test_prd_parser_missing_file():
    """Test parsing non-existent PRD."""
    parser = PRDParser()

    with pytest.raises(FileNotFoundError):
        parser.parse_prd("/nonexistent/prd.md")


def test_prd_parser_parse_content():
    """Test parsing PRD content string."""
    parser = PRDParser()
    content = """# Main Section

Some content here.

- Objective 1
- Objective 2

## Subsection

More content.

- Another objective
"""

    sections = parser.parse_prd_content(content)

    assert len(sections) == 2
    assert sections[0].title == "Main Section"
    assert sections[0].level == 1
    assert len(sections[0].objectives) == 2
    assert sections[1].title == "Subsection"
    assert sections[1].level == 2


def test_prd_parser_extract_topics(sample_prd_md):
    """Test extracting topics from PRD."""
    parser = PRDParser()
    sections = parser.parse_prd(sample_prd_md)
    topics = parser.extract_topics(sections)

    assert len(topics) > 0
    # Should only include h1 and h2
    assert "Project Overview" in topics
    assert "CLI Framework" in topics
    # h3 should not be included
    assert "Advanced Config" not in topics


def test_create_curriculum_backlog_mapping(sample_prd_md, sample_tasks_json):
    """Test creating curriculum-backlog mapping."""
    prd_parser = PRDParser()
    task_parser = TaskmasterParser()

    prd_sections = prd_parser.parse_prd(sample_prd_md)
    tasks = task_parser.parse_tasks_json(sample_tasks_json)

    mapping = create_curriculum_backlog_mapping(prd_sections, tasks)

    assert isinstance(mapping, dict)
    assert len(mapping) > 0

    # Should have mappings for main topics
    assert any("CLI" in key for key in mapping.keys())
    assert any("Configuration" in key for key in mapping.keys())


def test_create_mapping_with_keywords():
    """Test mapping with explicit keywords."""
    prd_sections = [
        PRDSection(
            title="CLI Development",
            content="Build CLI tools",
            level=1,
            objectives=["Create CLI"],
        )
    ]

    tasks = [
        TaskmasterTask(
            id="1",
            title="Setup CLI",
            description="CLI framework",
            dependencies=[],
            status="pending",
            tags=["cli-tool"],
        )
    ]

    keywords_to_tags = {"CLI": ["cli-tool"]}

    mapping = create_curriculum_backlog_mapping(
        prd_sections, tasks, keywords_to_tags=keywords_to_tags
    )

    assert "CLI Development" in mapping
    assert "1" in mapping["CLI Development"]


def test_empty_prd_sections():
    """Test mapping with empty PRD sections."""
    tasks = [
        TaskmasterTask(
            id="1",
            title="Task",
            description="Description",
            dependencies=[],
            status="pending",
        )
    ]

    mapping = create_curriculum_backlog_mapping([], tasks)

    assert isinstance(mapping, dict)
    assert len(mapping) == 0


def test_empty_tasks():
    """Test mapping with empty tasks list."""
    prd_sections = [
        PRDSection(title="Section", content="Content", level=1, objectives=[])
    ]

    mapping = create_curriculum_backlog_mapping(prd_sections, [])

    assert isinstance(mapping, dict)
    # Should still have section, just with empty task list
    assert "Section" in mapping
    assert mapping["Section"] == []
