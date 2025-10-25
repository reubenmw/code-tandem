"""Tests for code extraction parser."""

import pytest
from pathlib import Path
from codetandem.code_parser import extract_todo_code, find_all_todos, CodeExtraction


@pytest.fixture
def sample_file_with_todos(tmp_path):
    """Create a sample file with TODO comments."""
    file_path = tmp_path / "sample.py"
    content = """# Sample Python file
def function1():
    pass

// TODO: Implement feature A
def feature_a():
    print("Feature A implementation")
    return 42

// TODO: Implement feature B
def feature_b():
    print("Feature B implementation")
    return "B"

def function2():
    pass
"""
    file_path.write_text(content)
    return file_path


@pytest.fixture
def sample_file_no_todos(tmp_path):
    """Create a sample file without TODO comments."""
    file_path = tmp_path / "no_todos.py"
    content = """def function():
    return True
"""
    file_path.write_text(content)
    return file_path


def test_extract_todo_code_last_todo(sample_file_with_todos):
    """Test extracting code from last TODO."""
    result = extract_todo_code(str(sample_file_with_todos))

    assert result is not None
    assert isinstance(result, CodeExtraction)
    assert "feature b" in result.todo_text.lower()
    assert "Feature B implementation" in result.code
    assert result.todo_line == 10


def test_extract_todo_code_first_todo(sample_file_with_todos):
    """Test extracting code from first TODO."""
    result = extract_todo_code(str(sample_file_with_todos), todo_index=0)

    assert result is not None
    assert "feature a" in result.todo_text.lower()
    assert "Feature A implementation" in result.code


def test_extract_todo_code_by_text(sample_file_with_todos):
    """Test extracting code by TODO text match."""
    result = extract_todo_code(str(sample_file_with_todos), todo_text="feature A")

    assert result is not None
    assert "feature a" in result.todo_text.lower()
    assert "Feature A implementation" in result.code


def test_extract_todo_code_no_file():
    """Test with non-existent file."""
    result = extract_todo_code("/nonexistent/file.py")
    assert result is None


def test_extract_todo_code_no_todos(sample_file_no_todos):
    """Test with file that has no TODOs."""
    result = extract_todo_code(str(sample_file_no_todos))
    assert result is None


def test_extract_todo_code_nonexistent_text(sample_file_with_todos):
    """Test with TODO text that doesn't exist."""
    result = extract_todo_code(str(sample_file_with_todos), todo_text="nonexistent")
    assert result is None


def test_find_all_todos(sample_file_with_todos):
    """Test finding all TODO comments."""
    todos = find_all_todos(str(sample_file_with_todos))

    assert len(todos) == 2
    assert todos[0][0] == 5  # Line number of first TODO
    assert "feature a" in todos[0][1].lower()
    assert todos[1][0] == 10  # Line number of second TODO
    assert "feature b" in todos[1][1].lower()


def test_find_all_todos_no_file():
    """Test finding TODOs in non-existent file."""
    todos = find_all_todos("/nonexistent/file.py")
    assert todos == []


def test_find_all_todos_no_todos(sample_file_no_todos):
    """Test finding TODOs in file without any."""
    todos = find_all_todos(str(sample_file_no_todos))
    assert todos == []


def test_code_extraction_to_dict(sample_file_with_todos):
    """Test CodeExtraction to_dict method."""
    result = extract_todo_code(str(sample_file_with_todos))

    data = result.to_dict()
    assert isinstance(data, dict)
    assert "file_path" in data
    assert "todo_line" in data
    assert "todo_text" in data
    assert "code" in data
    assert "start_line" in data
    assert "end_line" in data


def test_extract_empty_todo(tmp_path):
    """Test extracting TODO with no code after it."""
    file_path = tmp_path / "empty_todo.py"
    content = """def function():
    pass

// TODO: Implement this
"""
    file_path.write_text(content)

    result = extract_todo_code(str(file_path))
    assert result is not None
    assert result.code.strip() == ""


def test_extract_multiline_code(tmp_path):
    """Test extracting multi-line code block."""
    file_path = tmp_path / "multiline.py"
    content = """// TODO: Implement complex feature
def complex_feature():
    result = []
    for i in range(10):
        result.append(i * 2)
    return result
"""
    file_path.write_text(content)

    result = extract_todo_code(str(file_path))
    assert result is not None
    assert "for i in range(10):" in result.code
    assert len(result.code.splitlines()) > 1
