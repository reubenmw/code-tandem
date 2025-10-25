"""Tests for project directory file tree scanner."""

import tempfile
from pathlib import Path

import pytest

from codetandem.scanner import get_file_tree, should_ignore, DEFAULT_IGNORE_PATTERNS


def test_should_ignore_exact_match():
    """Test exact pattern matching."""
    assert should_ignore("node_modules", DEFAULT_IGNORE_PATTERNS) is True
    assert should_ignore(".git", DEFAULT_IGNORE_PATTERNS) is True
    assert should_ignore("src", DEFAULT_IGNORE_PATTERNS) is False


def test_should_ignore_wildcard():
    """Test wildcard pattern matching."""
    assert should_ignore("test.pyc", DEFAULT_IGNORE_PATTERNS) is True
    assert should_ignore("test.py", DEFAULT_IGNORE_PATTERNS) is False


def test_get_file_tree_simple():
    """Test scanning a simple directory structure."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        # Create test structure
        (tmp_path / "file1.txt").write_text("content")
        (tmp_path / "file2.py").write_text("code")
        (tmp_path / "subdir").mkdir()
        (tmp_path / "subdir" / "file3.txt").write_text("more content")

        tree = get_file_tree(tmp_path)

        assert tree["type"] == "directory"
        assert tree["name"] == tmp_path.name
        assert len(tree["children"]) == 3

        # Check files are present
        file_names = [
            child["name"] for child in tree["children"] if child["type"] == "file"
        ]
        assert "file1.txt" in file_names
        assert "file2.py" in file_names

        # Check subdirectory
        subdirs = [child for child in tree["children"] if child["type"] == "directory"]
        assert len(subdirs) == 1
        assert subdirs[0]["name"] == "subdir"
        assert len(subdirs[0]["children"]) == 1
        assert subdirs[0]["children"][0]["name"] == "file3.txt"


def test_get_file_tree_ignores_patterns():
    """Test that ignored patterns are excluded."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        # Create files that should be ignored
        (tmp_path / ".git").mkdir()
        (tmp_path / "node_modules").mkdir()
        (tmp_path / "test.pyc").write_text("bytecode")

        # Create files that should be included
        (tmp_path / "src").mkdir()
        (tmp_path / "test.py").write_text("code")

        tree = get_file_tree(tmp_path)

        # Get all names in the tree
        names = [child["name"] for child in tree["children"]]

        # Ignored items should not be present
        assert ".git" not in names
        assert "node_modules" not in names
        assert "test.pyc" not in names

        # Included items should be present
        assert "src" in names
        assert "test.py" in names


def test_get_file_tree_custom_ignore():
    """Test using custom ignore patterns."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        (tmp_path / "keep.txt").write_text("keep")
        (tmp_path / "ignore.txt").write_text("ignore")

        custom_ignore = {"ignore.txt"}
        tree = get_file_tree(tmp_path, ignore_patterns=custom_ignore)

        names = [child["name"] for child in tree["children"]]
        assert "keep.txt" in names
        assert "ignore.txt" not in names


def test_get_file_tree_max_depth():
    """Test limiting scan depth."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        # Create nested structure
        (tmp_path / "level1").mkdir()
        (tmp_path / "level1" / "level2").mkdir()
        (tmp_path / "level1" / "level2" / "level3").mkdir()
        (tmp_path / "level1" / "level2" / "level3" / "file.txt").write_text("deep")

        # Scan with depth limit
        tree = get_file_tree(tmp_path, max_depth=2)

        # Should have level1
        level1 = [child for child in tree["children"] if child["name"] == "level1"][0]
        assert len(level1["children"]) > 0

        # Should have level2
        level2 = [child for child in level1["children"] if child["name"] == "level2"][0]

        # But level2 should be empty due to depth limit
        assert len(level2["children"]) == 0


def test_get_file_tree_empty_directory():
    """Test scanning an empty directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        tree = get_file_tree(tmp_path)

        assert tree["type"] == "directory"
        assert tree["children"] == []


def test_get_file_tree_nonexistent_path():
    """Test that nonexistent path raises ValueError."""
    with pytest.raises(ValueError, match="does not exist"):
        get_file_tree("/nonexistent/path/12345")


def test_get_file_tree_file_not_directory():
    """Test that passing a file raises ValueError."""
    with tempfile.NamedTemporaryFile() as tmpfile:
        with pytest.raises(ValueError, match="not a directory"):
            get_file_tree(tmpfile.name)


def test_file_sizes_included():
    """Test that file sizes are included in the tree."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)

        test_content = "test content"
        (tmp_path / "test.txt").write_text(test_content)

        tree = get_file_tree(tmp_path)

        file_node = tree["children"][0]
        assert file_node["type"] == "file"
        assert "size" in file_node
        assert file_node["size"] == len(test_content)
