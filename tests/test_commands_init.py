"""Tests for init CLI command."""

import json
import tempfile
from pathlib import Path

from typer.testing import CliRunner

from codetandem.main import app

runner = CliRunner()


def test_init_command_success():
    """Test successful project initialization."""
    curriculum_content = """# Module 1: Basics
- Learn fundamentals

# Module 2: Advanced
- Master concepts
"""

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        # Create curriculum file
        curriculum_file = tmp_path / "curriculum.md"
        curriculum_file.write_text(curriculum_content, encoding="utf-8")

        # Create a simple project structure
        project_dir = tmp_path / "project"
        project_dir.mkdir()
        (project_dir / "main.py").write_text("print('hello')")

        # Run init command
        result = runner.invoke(
            app,
            [
                "init",
                "--project",
                str(project_dir),
                "--curriculum",
                str(curriculum_file),
            ],
        )

        assert result.exit_code == 0
        assert "Project initialized successfully" in result.stdout

        # Check that files were created
        modules_file = project_dir / "modules.json"
        state_file = project_dir / "codetandem.state.json"

        assert modules_file.exists()
        assert state_file.exists()

        # Verify modules.json content
        with open(modules_file, "r") as f:
            modules_data = json.load(f)

        assert len(modules_data["modules"]) == 2
        assert modules_data["modules"][0]["id"] == "module_1"

        # Verify state.json content
        with open(state_file, "r") as f:
            state_data = json.load(f)

        assert state_data["current_module_id"] == "module_1"
        assert "project_tree" in state_data


def test_init_command_with_output_dir():
    """Test init with custom output directory."""
    curriculum_content = """# Module 1
- Objective 1
"""

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        curriculum_file = tmp_path / "curriculum.md"
        curriculum_file.write_text(curriculum_content, encoding="utf-8")

        project_dir = tmp_path / "project"
        project_dir.mkdir()
        (project_dir / "file.txt").write_text("test")

        output_dir = tmp_path / "output"

        result = runner.invoke(
            app,
            [
                "init",
                "--project",
                str(project_dir),
                "--curriculum",
                str(curriculum_file),
                "--output",
                str(output_dir),
            ],
        )

        assert result.exit_code == 0

        # Files should be in output directory
        assert (output_dir / "modules.json").exists()
        assert (output_dir / "codetandem.state.json").exists()


def test_init_command_missing_curriculum():
    """Test init without curriculum parameter."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        project_dir = tmp_path / "project"
        project_dir.mkdir()

        result = runner.invoke(app, ["init", "--project", str(project_dir)])

        assert result.exit_code == 1
        assert "curriculum" in result.stdout.lower()


def test_init_command_nonexistent_curriculum():
    """Test init with nonexistent curriculum file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        project_dir = tmp_path / "project"
        project_dir.mkdir()

        result = runner.invoke(
            app,
            [
                "init",
                "--project",
                str(project_dir),
                "--curriculum",
                "/nonexistent/curriculum.md",
            ],
        )

        assert result.exit_code == 1
        assert "not found" in result.stdout


def test_init_command_nonexistent_project():
    """Test init with nonexistent project directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        curriculum_file = tmp_path / "curriculum.md"
        curriculum_file.write_text("# Module 1\n- Objective 1")

        result = runner.invoke(
            app,
            [
                "init",
                "--project",
                "/nonexistent/project",
                "--curriculum",
                str(curriculum_file),
            ],
        )

        assert result.exit_code == 1
        assert "not found" in result.stdout


def test_init_command_default_project_dir():
    """Test init with default project directory (current directory)."""
    curriculum_content = """# Module 1
- Objective 1
"""

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        curriculum_file = tmp_path / "curriculum.md"
        curriculum_file.write_text(curriculum_content, encoding="utf-8")

        # Change to temp directory and run init
        import os

        original_cwd = os.getcwd()
        try:
            os.chdir(tmp_path)

            result = runner.invoke(app, ["init", "--curriculum", str(curriculum_file)])

            assert result.exit_code == 0
            assert (tmp_path / "modules.json").exists()
            assert (tmp_path / "codetandem.state.json").exists()
        finally:
            os.chdir(original_cwd)


def test_init_command_complex_project():
    """Test init with a more complex project structure."""
    curriculum_content = """# Module 1: Setup
- Install dependencies
- Configure environment

# Module 2: Development
- Write code
- Add tests

# Module 3: Deployment
- Build application
- Deploy to production
"""

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        curriculum_file = tmp_path / "curriculum.md"
        curriculum_file.write_text(curriculum_content, encoding="utf-8")

        # Create complex project structure
        project_dir = tmp_path / "project"
        project_dir.mkdir()

        (project_dir / "src").mkdir()
        (project_dir / "src" / "main.py").write_text("code")
        (project_dir / "src" / "utils.py").write_text("utils")

        (project_dir / "tests").mkdir()
        (project_dir / "tests" / "test_main.py").write_text("tests")

        (project_dir / "README.md").write_text("# Project")

        result = runner.invoke(
            app,
            [
                "init",
                "--project",
                str(project_dir),
                "--curriculum",
                str(curriculum_file),
            ],
        )

        assert result.exit_code == 0
        assert "3 modules" in result.stdout

        # Verify state includes project tree
        with open(project_dir / "codetandem.state.json", "r") as f:
            state_data = json.load(f)

        assert state_data["project_tree"]["type"] == "directory"
        assert len(state_data["project_tree"]["children"]) > 0
