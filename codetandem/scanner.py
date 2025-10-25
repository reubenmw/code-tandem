"""Project directory file tree scanner."""

import os
from pathlib import Path
from typing import Dict, List, Union

# Common directories and files to ignore
DEFAULT_IGNORE_PATTERNS = {
    ".git",
    ".gitignore",
    "node_modules",
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "venv",
    ".env",
    ".DS_Store",
    "*.pyc",
    ".idea",
    ".vscode",
    "dist",
    "build",
    "*.egg-info",
}


FileTree = Dict[str, Union[str, List["FileTree"]]]


def should_ignore(name: str, ignore_patterns: set) -> bool:
    """
    Check if a file or directory should be ignored.

    Args:
        name: File or directory name
        ignore_patterns: Set of patterns to ignore

    Returns:
        True if the item should be ignored
    """
    # Check exact matches
    if name in ignore_patterns:
        return True

    # Check wildcard patterns
    for pattern in ignore_patterns:
        if pattern.startswith("*"):
            if name.endswith(pattern[1:]):
                return True

    return False


def scan_directory(
    path: Path,
    ignore_patterns: set = None,
    max_depth: int = None,
    _current_depth: int = 0,
) -> FileTree:
    """
    Recursively scan a directory and build a file tree representation.

    Args:
        path: Path to the directory to scan
        ignore_patterns: Set of file/directory patterns to ignore
        max_depth: Maximum depth to scan (None for unlimited)
        _current_depth: Internal parameter for tracking recursion depth

    Returns:
        Dictionary representing the file tree structure

    Raises:
        ValueError: If path doesn't exist or isn't a directory
    """
    if not path.exists():
        raise ValueError(f"Path does not exist: {path}")

    if not path.is_dir():
        raise ValueError(f"Path is not a directory: {path}")

    if ignore_patterns is None:
        ignore_patterns = DEFAULT_IGNORE_PATTERNS

    if max_depth is not None and _current_depth >= max_depth:
        return {"type": "directory", "name": path.name, "children": []}

    tree: FileTree = {"type": "directory", "name": path.name, "children": []}

    try:
        entries = sorted(path.iterdir(), key=lambda p: (not p.is_dir(), p.name))
    except PermissionError:
        # Skip directories we don't have permission to read
        return tree

    for entry in entries:
        # Skip ignored items
        if should_ignore(entry.name, ignore_patterns):
            continue

        if entry.is_file():
            tree["children"].append(
                {"type": "file", "name": entry.name, "size": entry.stat().st_size}
            )
        elif entry.is_dir():
            subtree = scan_directory(
                entry, ignore_patterns, max_depth, _current_depth + 1
            )
            tree["children"].append(subtree)

    return tree


def get_file_tree(
    project_path: Union[str, Path], ignore_patterns: set = None, max_depth: int = None
) -> FileTree:
    """
    Get the file tree for a project directory.

    Args:
        project_path: Path to the project directory
        ignore_patterns: Custom ignore patterns (uses defaults if None)
        max_depth: Maximum depth to scan (None for unlimited)

    Returns:
        Dictionary representing the file tree structure
    """
    path = Path(project_path).resolve()
    return scan_directory(path, ignore_patterns, max_depth)
