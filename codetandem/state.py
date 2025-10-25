"""Project state management and codetandem.state.json generation."""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Union

from codetandem.modules import load_modules
from codetandem.scanner import FileTree, get_file_tree


def generate_initial_state(
    modules_path: Union[str, Path],
    project_path: Union[str, Path],
    output_path: Union[str, Path],
    initial_skill_score: float = 0.0,
) -> Dict:
    """
    Generate initial codetandem.state.json file.

    Args:
        modules_path: Path to modules.json file
        project_path: Path to the project directory to scan
        output_path: Path where state.json should be written
        initial_skill_score: Initial skill score (default 0.0)

    Returns:
        Dictionary containing the state data that was written

    Raises:
        FileNotFoundError: If modules.json or project directory doesn't exist
        ValueError: If modules.json has no modules
    """
    # Load modules
    modules = load_modules(modules_path)

    if not modules:
        raise ValueError("No modules found in modules.json")

    # Get the first module
    first_module = modules[0]

    # Scan project directory
    file_tree = get_file_tree(project_path)

    # Generate initial state
    state_data = {
        "version": "1.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "current_module_id": first_module.id,
        "skill_scores": {first_module.id: initial_skill_score},
        "completed_modules": [],
        "project_tree": file_tree,
        "metadata": {
            "total_modules": len(modules),
            "project_path": str(Path(project_path).resolve()),
        },
    }

    # Write to file
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(state_data, f, indent=2, ensure_ascii=False)

    return state_data


def load_state(state_path: Union[str, Path]) -> Dict:
    """
    Load state from codetandem.state.json file.

    Args:
        state_path: Path to state.json file

    Returns:
        Dictionary containing the state data

    Raises:
        FileNotFoundError: If state.json doesn't exist
        ValueError: If state.json is invalid
    """
    state_path = Path(state_path)

    if not state_path.exists():
        raise FileNotFoundError(f"State file not found: {state_path}")

    with open(state_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Validate required fields
    required_fields = ["current_module_id", "skill_scores", "completed_modules"]
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Invalid state.json: missing '{field}' field")

    return data


def update_state(
    state_path: Union[str, Path],
    current_module_id: str = None,
    skill_score: float = None,
    completed_module_id: str = None,
    project_tree: FileTree = None,
    hint_count: int = None,
    difficulty_override: str = None,
    assessment_pending: bool = None,
) -> Dict:
    """
    Update an existing state file.

    Args:
        state_path: Path to state.json file
        current_module_id: New current module ID
        skill_score: Update skill score for current module
        completed_module_id: Module ID to mark as completed
        project_tree: Updated project tree

    Returns:
        Updated state dictionary

    Raises:
        FileNotFoundError: If state.json doesn't exist
    """
    state = load_state(state_path)

    # Update current module
    if current_module_id is not None:
        state["current_module_id"] = current_module_id

    # Update skill score
    if skill_score is not None:
        current_id = state["current_module_id"]
        state["skill_scores"][current_id] = skill_score

    # Mark module as completed
    if completed_module_id is not None:
        if completed_module_id not in state["completed_modules"]:
            state["completed_modules"].append(completed_module_id)

    # Update project tree
    if project_tree is not None:
        state["project_tree"] = project_tree

    # Update hint count
    if hint_count is not None:
        current_id = state["current_module_id"]
        if "hints" not in state:
            state["hints"] = {}
        state["hints"][current_id] = hint_count

    # Update difficulty override
    if difficulty_override is not None:
        state["difficulty_override"] = difficulty_override

    # Update assessment pending status
    if assessment_pending is not None:
        state["assessment_pending"] = assessment_pending

    # Update timestamp
    state["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Write back to file
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)

    return state


def get_current_module_id(state: Dict) -> str:
    """Get the current module ID from state."""
    return state["current_module_id"]


def get_skill_score(state: Dict, module_id: str) -> float:
    """Get the skill score for a module."""
    return state["skill_scores"].get(module_id, 0.0)


def is_module_completed(state: Dict, module_id: str) -> bool:
    """Check if a module is completed."""
    return module_id in state["completed_modules"]


def get_hint_count(state: Dict, module_id: str) -> int:
    """Get the hint count for a module."""
    return state.get("hints", {}).get(module_id, 0)


def increment_skill_score(
    state_path: Union[str, Path], module_id: str, points: float
) -> float:
    """
    Increment the skill score for a module.

    Args:
        state_path: Path to state.json file
        module_id: Module ID to update
        points: Points to add to current score

    Returns:
        New skill score
    """
    state = load_state(state_path)

    current_score = state["skill_scores"].get(module_id, 0.0)
    new_score = current_score + points

    # Update the score
    state["skill_scores"][module_id] = new_score
    state["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Write back to file
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)

    return new_score
