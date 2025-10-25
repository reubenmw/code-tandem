"""Module management and modules.json generation."""

import json
from pathlib import Path
from typing import Dict, List, Union

from codetandem.curriculum import Module, parse_curriculum


def generate_modules_json(
    curriculum_path: Union[str, Path], output_path: Union[str, Path]
) -> Dict:
    """
    Generate modules.json from a curriculum file.

    Args:
        curriculum_path: Path to the curriculum Markdown file
        output_path: Path where modules.json should be written

    Returns:
        Dictionary containing the modules data that was written

    Raises:
        FileNotFoundError: If curriculum file doesn't exist
        ValueError: If curriculum is empty or invalid
    """
    # Check if curriculum file exists
    curriculum_path = Path(curriculum_path)
    if not curriculum_path.exists():
        raise FileNotFoundError(f"Curriculum file not found: {curriculum_path}")

    # Parse the curriculum
    modules = parse_curriculum(curriculum_path)

    if not modules:
        raise ValueError("Curriculum contains no modules")

    # Convert to dictionary format
    modules_data = {"modules": [module.to_dict() for module in modules]}

    # Write to file
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(modules_data, f, indent=2, ensure_ascii=False)

    return modules_data


def load_modules(modules_path: Union[str, Path]) -> List[Module]:
    """
    Load modules from modules.json file.

    Args:
        modules_path: Path to modules.json file

    Returns:
        List of Module objects

    Raises:
        FileNotFoundError: If modules.json doesn't exist
        ValueError: If modules.json is invalid
    """
    modules_path = Path(modules_path)

    if not modules_path.exists():
        raise FileNotFoundError(f"Modules file not found: {modules_path}")

    with open(modules_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if "modules" not in data:
        raise ValueError("Invalid modules.json: missing 'modules' key")

    modules = []
    for module_data in data["modules"]:
        module = Module(
            id=module_data["id"],
            title=module_data["title"],
            objectives=module_data.get("objectives", []),
        )
        modules.append(module)

    return modules


def get_module_by_id(modules: List[Module], module_id: str) -> Module:
    """
    Get a module by its ID.

    Args:
        modules: List of modules to search
        module_id: ID of the module to find

    Returns:
        The matching Module object

    Raises:
        ValueError: If module with given ID is not found
    """
    for module in modules:
        if module.id == module_id:
            return module

    raise ValueError(f"Module not found: {module_id}")
