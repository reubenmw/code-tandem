"""
Code parser for extracting user-written code from source files.

This module provides functionality to locate TODO comments and extract
the code written by users to fulfill those tasks.
"""

import re
from pathlib import Path
from typing import Optional, Tuple


class CodeExtraction:
    """Represents extracted code from a source file."""

    def __init__(
        self,
        file_path: str,
        todo_line: int,
        todo_text: str,
        code: str,
        start_line: int,
        end_line: int,
    ):
        self.file_path = file_path
        self.todo_line = todo_line
        self.todo_text = todo_text
        self.code = code
        self.start_line = start_line
        self.end_line = end_line

    def to_dict(self):
        """Convert to dictionary representation."""
        return {
            "file_path": self.file_path,
            "todo_line": self.todo_line,
            "todo_text": self.todo_text,
            "code": self.code,
            "start_line": self.start_line,
            "end_line": self.end_line,
        }


def extract_todo_code(
    file_path: str, todo_text: Optional[str] = None, todo_index: int = -1
) -> Optional[CodeExtraction]:
    """
    Extract code associated with a TODO comment from a source file.

    Args:
        file_path: Path to the source file
        todo_text: Optional specific TODO text to search for
        todo_index: Index of TODO to extract (-1 for last, 0 for first, etc.)

    Returns:
        CodeExtraction object if TODO found, None otherwise
    """
    path = Path(file_path)
    if not path.exists():
        return None

    try:
        content = path.read_text(encoding="utf-8")
    except Exception:
        return None

    lines = content.splitlines()

    # Find all TODO comments
    todo_pattern = re.compile(r"//\s*TODO:?\s*(.+)", re.IGNORECASE)
    todos = []

    for line_num, line in enumerate(lines, 1):
        match = todo_pattern.search(line)
        if match:
            todos.append((line_num, match.group(1).strip()))

    if not todos:
        return None

    # Select the target TODO
    if todo_text:
        # Find TODO by matching text
        target_todo = None
        for line_num, text in todos:
            if todo_text.lower() in text.lower():
                target_todo = (line_num, text)
                break
        if not target_todo:
            return None
    else:
        # Use index
        try:
            target_todo = todos[todo_index]
        except IndexError:
            return None

    todo_line, todo_content = target_todo

    # Extract code after TODO until next TODO or end of meaningful code
    start_line = todo_line
    end_line = todo_line

    # Find the next TODO or end of file
    next_todo_line = None
    for line_num, _ in todos:
        if line_num > todo_line:
            next_todo_line = line_num
            break

    # Determine end of code block
    if next_todo_line:
        end_line = next_todo_line - 1
    else:
        end_line = len(lines)

    # Extract code lines (skip the TODO line itself)
    code_lines = []
    for i in range(todo_line, end_line):
        if i < len(lines):
            line = lines[i]
            # Skip the TODO comment line
            if i == todo_line - 1:
                continue
            code_lines.append(line)

    # Trim trailing empty lines
    while code_lines and not code_lines[-1].strip():
        code_lines.pop()
        end_line -= 1

    code = "\n".join(code_lines)

    return CodeExtraction(
        file_path=file_path,
        todo_line=todo_line,
        todo_text=todo_content,
        code=code,
        start_line=start_line + 1,  # Line after TODO
        end_line=end_line,
    )


def find_all_todos(file_path: str) -> list[Tuple[int, str]]:
    """
    Find all TODO comments in a file.

    Args:
        file_path: Path to the source file

    Returns:
        List of tuples (line_number, todo_text)
    """
    path = Path(file_path)
    if not path.exists():
        return []

    try:
        content = path.read_text(encoding="utf-8")
    except Exception:
        return []

    lines = content.splitlines()
    todo_pattern = re.compile(r"//\s*TODO:?\s*(.+)", re.IGNORECASE)
    todos = []

    for line_num, line in enumerate(lines, 1):
        match = todo_pattern.search(line)
        if match:
            todos.append((line_num, match.group(1).strip()))

    return todos
