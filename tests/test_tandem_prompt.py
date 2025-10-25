"""Tests for prompt engineering."""

from pathlib import Path

from codetandem.curriculum import Module
from codetandem.tandem import ProjectContext, build_coding_prompt


def test_build_coding_prompt_basic():
    """Test building a basic coding prompt."""
    context = ProjectContext(
        state={"current_module_id": "module_1"},
        modules=[Module("module_1", "Python Basics", ["Learn variables"])],
        current_module=Module("module_1", "Python Basics", ["Learn variables"]),
        project_path=Path("."),
    )

    prompt = build_coding_prompt(context)

    assert "CodeTandem" in prompt
    assert "Python Basics" in prompt
    assert "module_1" in prompt
    assert "Learn variables" in prompt
    assert "JSON" in prompt
    assert "file_path" in prompt
    assert "TODO" in prompt


def test_build_coding_prompt_with_file():
    """Test building prompt with target file."""
    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test", ["Objective 1"])],
        current_module=Module("mod_1", "Test", ["Objective 1"]),
        project_path=Path("."),
    )

    prompt = build_coding_prompt(
        context, target_file=Path("main.py"), file_content="print('hello')"
    )

    assert "main.py" in prompt
    assert "print('hello')" in prompt
    assert "Current File Content" in prompt


def test_build_coding_prompt_empty_file():
    """Test building prompt with empty file content."""
    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test", ["Objective 1"])],
        current_module=Module("mod_1", "Test", ["Objective 1"]),
        project_path=Path("."),
    )

    prompt = build_coding_prompt(context, target_file=Path("new.py"), file_content="")

    assert "new.py" in prompt
    assert "Empty file" in prompt


def test_build_coding_prompt_multiple_objectives():
    """Test prompt with multiple objectives."""
    objectives = ["Learn variables", "Understand functions", "Master classes"]

    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test", objectives)],
        current_module=Module("mod_1", "Test", objectives),
        project_path=Path("."),
    )

    # Test with second objective
    prompt = build_coding_prompt(context, objective_index=1)

    assert "Learn variables" in prompt
    assert "Understand functions" in prompt
    assert "Master classes" in prompt
    # The current objective should be marked with arrow
    assert "→ 2. Understand functions" in prompt


def test_build_coding_prompt_no_objectives():
    """Test prompt when module has no objectives."""
    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test Module", [])],
        current_module=Module("mod_1", "Test Module", []),
        project_path=Path("."),
    )

    prompt = build_coding_prompt(context)

    assert "Test Module" in prompt
    assert "mod_1" in prompt
    # Should still have task instructions
    assert "Your Task" in prompt


def test_build_coding_prompt_structure():
    """Test that prompt has all required sections."""
    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test", ["Objective"])],
        current_module=Module("mod_1", "Test", ["Objective"]),
        project_path=Path("."),
    )

    prompt = build_coding_prompt(context, target_file=Path("test.py"), file_content="")

    # Check for all major sections
    assert "Current Learning Module" in prompt
    assert "Current Learning Objective" in prompt
    assert "All Module Objectives" in prompt
    assert "Target File" in prompt
    assert "Current File Content" in prompt
    assert "Your Task" in prompt
    assert "Format your response as JSON" in prompt


def test_build_coding_prompt_todo_format():
    """Test that TODO format instructions are included."""
    context = ProjectContext(
        state={"current_module_id": "module_abc"},
        modules=[Module("module_abc", "Test", ["Objective"])],
        current_module=Module("module_abc", "Test", ["Objective"]),
        project_path=Path("."),
    )

    prompt = build_coding_prompt(context)

    assert "TODO: [module_abc]" in prompt


def test_build_coding_prompt_invalid_objective_index():
    """Test prompt with out-of-range objective index."""
    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test", ["Objective 1"])],
        current_module=Module("mod_1", "Test", ["Objective 1"]),
        project_path=Path("."),
    )

    # Index 5 is out of range (only have 1 objective)
    prompt = build_coding_prompt(context, objective_index=5)

    # Should still generate a valid prompt
    assert "Test" in prompt
    assert "mod_1" in prompt


def test_build_coding_prompt_beginner_scaffolding():
    """Test prompt with beginner skill level (high scaffolding)."""
    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test", ["Objective"])],
        current_module=Module("mod_1", "Test", ["Objective"]),
        project_path=Path("."),
    )

    prompt = build_coding_prompt(context, skill_level=1.5)

    assert "Scaffolding Level" in prompt
    assert "BEGINNER" in prompt
    assert "DETAILED scaffolding" in prompt
    assert "step-by-step hints" in prompt
    assert "code snippets" in prompt


def test_build_coding_prompt_intermediate_scaffolding():
    """Test prompt with intermediate skill level (medium scaffolding)."""
    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test", ["Objective"])],
        current_module=Module("mod_1", "Test", ["Objective"]),
        project_path=Path("."),
    )

    prompt = build_coding_prompt(context, skill_level=5.0)

    assert "Scaffolding Level" in prompt
    assert "INTERMEDIATE" in prompt
    assert "GOAL-ORIENTED scaffolding" in prompt
    assert "describing the goal" in prompt
    assert "not full implementations" in prompt


def test_build_coding_prompt_advanced_scaffolding():
    """Test prompt with advanced skill level (low scaffolding)."""
    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test", ["Objective"])],
        current_module=Module("mod_1", "Test", ["Objective"]),
        project_path=Path("."),
    )

    prompt = build_coding_prompt(context, skill_level=9.0)

    assert "Scaffolding Level" in prompt
    assert "ADVANCED" in prompt
    assert "CONCEPTUAL scaffolding" in prompt
    assert "high-level TODO" in prompt
    assert "architecture and design patterns" in prompt


def test_build_coding_prompt_skill_level_boundaries():
    """Test scaffolding at skill level boundaries."""
    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test", ["Objective"])],
        current_module=Module("mod_1", "Test", ["Objective"]),
        project_path=Path("."),
    )

    # Test at boundary values
    prompt_low = build_coding_prompt(context, skill_level=2.9)
    assert "BEGINNER" in prompt_low

    prompt_mid = build_coding_prompt(context, skill_level=3.0)
    assert "INTERMEDIATE" in prompt_mid

    prompt_high = build_coding_prompt(context, skill_level=7.0)
    assert "ADVANCED" in prompt_high


def test_build_coding_prompt_default_skill_level():
    """Test prompt with default skill level (0.0)."""
    context = ProjectContext(
        state={"current_module_id": "mod_1"},
        modules=[Module("mod_1", "Test", ["Objective"])],
        current_module=Module("mod_1", "Test", ["Objective"]),
        project_path=Path("."),
    )

    prompt = build_coding_prompt(context)

    # Default should be beginner level
    assert "BEGINNER" in prompt
    assert "DETAILED scaffolding" in prompt
