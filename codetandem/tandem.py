"""Core tandem coding loop functionality."""

import json
from pathlib import Path
from typing import Dict, Optional, Union

from codetandem.curriculum import Module
from codetandem.modules import get_module_by_id, load_modules
from codetandem.providers.base import BaseAIProvider
from codetandem.state import get_current_module_id, load_state


class ProjectContext:
    """Container for project state and module information."""

    def __init__(
        self, state: Dict, modules: list, current_module: Module, project_path: Path
    ):
        """
        Initialize project context.

        Args:
            state: Project state dictionary
            modules: List of all modules
            current_module: The current active module
            project_path: Path to the project root
        """
        self.state = state
        self.modules = modules
        self.current_module = current_module
        self.project_path = project_path

    @property
    def current_module_id(self) -> str:
        """Get current module ID."""
        return get_current_module_id(self.state)

    @property
    def current_objectives(self) -> list:
        """Get objectives for current module."""
        return self.current_module.objectives

    @property
    def project_tree(self) -> Dict:
        """Get project file tree."""
        return self.state.get("project_tree", {})


def load_project_context(
    project_path: Union[str, Path],
    modules_file: str = "modules.json",
    state_file: str = "codetandem.state.json",
) -> ProjectContext:
    """
    Load project context from modules.json and state.json.

    Args:
        project_path: Path to the project root directory
        modules_file: Name of modules file (default: modules.json)
        state_file: Name of state file (default: codetandem.state.json)

    Returns:
        ProjectContext object with all loaded information

    Raises:
        FileNotFoundError: If required files are not found
        ValueError: If files are invalid or current module not found
    """
    project_path = Path(project_path).resolve()

    # Check if project path exists
    if not project_path.exists():
        raise FileNotFoundError(f"Project path not found: {project_path}")

    # Load modules
    modules_path = project_path / modules_file
    if not modules_path.exists():
        raise FileNotFoundError(
            f"modules.json not found at {modules_path}. "
            f"Run 'codetandem init' first to initialize the project."
        )

    modules = load_modules(modules_path)

    if not modules:
        raise ValueError("No modules found in modules.json")

    # Load state
    state_path = project_path / state_file
    if not state_path.exists():
        raise FileNotFoundError(
            f"State file not found at {state_path}. "
            f"Run 'codetandem init' first to initialize the project."
        )

    state = load_state(state_path)

    # Get current module
    current_module_id = get_current_module_id(state)
    try:
        current_module = get_module_by_id(modules, current_module_id)
    except ValueError:
        raise ValueError(
            f"Current module '{current_module_id}' not found in modules.json. "
            f"The state file may be out of sync."
        )

    return ProjectContext(
        state=state,
        modules=modules,
        current_module=current_module,
        project_path=project_path,
    )


def get_next_objective_index(context: ProjectContext) -> Optional[int]:
    """
    Get the index of the next objective to work on.

    Args:
        context: Project context

    Returns:
        Index of next objective, or None if all completed
    """
    # For now, return the first objective
    # In future, this could track which objectives are completed
    if context.current_objectives:
        return 0
    return None


def format_module_info(context: ProjectContext) -> str:
    """
    Format module information for display.

    Args:
        context: Project context

    Returns:
        Formatted string with module info
    """
    lines = []
    lines.append(f"Module: {context.current_module.title}")
    lines.append(f"ID: {context.current_module_id}")

    if context.current_objectives:
        lines.append("\nObjectives:")
        for i, obj in enumerate(context.current_objectives, 1):
            lines.append(f"  {i}. {obj}")

    return "\n".join(lines)


def build_coding_prompt(
    context: ProjectContext,
    target_file: Optional[Path] = None,
    file_content: Optional[str] = None,
    objective_index: int = 0,
    skill_level: float = 0.0,
) -> str:
    """
    Build a comprehensive prompt for AI code generation.

    Args:
        context: Project context
        target_file: Optional target file path (relative to project)
        file_content: Optional current content of target file
        objective_index: Index of the objective to work on (default: 0)
        skill_level: User's skill score for current module (0-10)

    Returns:
        Formatted prompt string for the AI
    """
    objective = None
    if objective_index < len(context.current_objectives):
        objective = context.current_objectives[objective_index]

    prompt_parts = []

    # System context
    prompt_parts.append(
        "You are CodeTandem, an AI pair programming assistant that helps users learn by writing foundational code and leaving TODO tasks for them to complete."
    )
    prompt_parts.append("")

    # Current learning module
    prompt_parts.append(f"# Current Learning Module")
    prompt_parts.append(f"Module: {context.current_module.title}")
    prompt_parts.append(f"Module ID: {context.current_module_id}")
    prompt_parts.append("")

    # Learning objective
    if objective:
        prompt_parts.append(f"# Current Learning Objective")
        prompt_parts.append(f"{objective}")
        prompt_parts.append("")

    # All objectives for context
    if context.current_objectives:
        prompt_parts.append(f"# All Module Objectives")
        for i, obj in enumerate(context.current_objectives, 1):
            marker = "→" if i - 1 == objective_index else " "
            prompt_parts.append(f"{marker} {i}. {obj}")
        prompt_parts.append("")

    # Target file information
    if target_file:
        prompt_parts.append(f"# Target File")
        prompt_parts.append(f"File: {target_file}")
        prompt_parts.append("")

        if file_content is not None:
            prompt_parts.append(f"# Current File Content")
            prompt_parts.append("```")
            prompt_parts.append(file_content if file_content else "# Empty file")
            prompt_parts.append("```")
            prompt_parts.append("")

    # Task instructions with dynamic scaffolding based on skill level
    prompt_parts.append("# Your Task")
    prompt_parts.append("Write foundational code that:")
    prompt_parts.append(
        "1. Implements the basic structure needed for the learning objective"
    )
    prompt_parts.append("2. Includes a clear TODO comment for the user to complete")
    prompt_parts.append(
        "3. Leaves the most educationally valuable part for the user to implement"
    )
    prompt_parts.append("")

    # Dynamic scaffolding based on skill level
    prompt_parts.append("# Scaffolding Level")
    if skill_level < 3.0:
        # Beginner: High scaffolding with detailed help
        prompt_parts.append("User skill level: BEGINNER")
        prompt_parts.append("Provide DETAILED scaffolding:")
        prompt_parts.append("- Write comprehensive foundational code")
        prompt_parts.append("- Include detailed TODO comments with step-by-step hints")
        prompt_parts.append("- Provide code snippets or examples in the TODO comment")
        prompt_parts.append("- Break down complex tasks into smaller, manageable steps")
        prompt_parts.append("- Add inline comments explaining key concepts")
    elif skill_level < 7.0:
        # Intermediate: Medium scaffolding with goal-oriented guidance
        prompt_parts.append("User skill level: INTERMEDIATE")
        prompt_parts.append("Provide GOAL-ORIENTED scaffolding:")
        prompt_parts.append("- Write solid foundational code structure")
        prompt_parts.append("- Include clear TODO comments describing the goal")
        prompt_parts.append(
            "- Provide hints about the approach, but not full implementations"
        )
        prompt_parts.append("- Let the user figure out implementation details")
        prompt_parts.append("- Add comments only for non-obvious design decisions")
    else:
        # Advanced: Low scaffolding with conceptual guidance
        prompt_parts.append("User skill level: ADVANCED")
        prompt_parts.append("Provide CONCEPTUAL scaffolding:")
        prompt_parts.append("- Write minimal foundational code (interfaces, types)")
        prompt_parts.append("- Include high-level TODO comments describing the concept")
        prompt_parts.append("- Focus on architecture and design patterns")
        prompt_parts.append("- Let the user implement most of the functionality")
        prompt_parts.append("- Assume the user understands implementation details")
    prompt_parts.append("")
    prompt_parts.append("Format your response as JSON with this structure:")
    prompt_parts.append("{")
    prompt_parts.append('  "file_path": "relative/path/to/file.ext",')
    prompt_parts.append('  "code": "complete file content with TODO",')
    prompt_parts.append('  "todo_line": 10,')
    prompt_parts.append(
        '  "todo_task": "Brief description of what the user should implement",'
    )
    prompt_parts.append('  "explanation": "Brief explanation of what you implemented"')
    prompt_parts.append("}")
    prompt_parts.append("")
    prompt_parts.append("The TODO comment should be formatted as:")
    prompt_parts.append(f"// TODO: [{context.current_module_id}] <task description>")

    return "\n".join(prompt_parts)


class CodeModification:
    """Represents a code modification from the AI."""

    def __init__(
        self,
        file_path: str,
        code: str,
        todo_line: int,
        todo_task: str,
        explanation: str,
    ):
        """
        Initialize code modification.

        Args:
            file_path: Relative path to the file
            code: Complete file content
            todo_line: Line number where TODO is located
            todo_task: Description of the TODO task
            explanation: Explanation of what was implemented
        """
        self.file_path = file_path
        self.code = code
        self.todo_line = todo_line
        self.todo_task = todo_task
        self.explanation = explanation


def generate_code_with_ai(
    provider: BaseAIProvider,
    context: ProjectContext,
    target_file: Optional[Path] = None,
    file_content: Optional[str] = None,
    objective_index: int = 0,
    skill_level: float = 0.0,
) -> CodeModification:
    """
    Generate code using AI provider.

    Args:
        provider: AI provider instance
        context: Project context
        target_file: Optional target file path
        file_content: Optional current file content
        objective_index: Index of objective to work on
        skill_level: User's skill score for current module (0-10)

    Returns:
        CodeModification object

    Raises:
        ValueError: If AI response is invalid
    """
    # Build prompt with skill level
    prompt = build_coding_prompt(
        context, target_file, file_content, objective_index, skill_level
    )

    # Get AI response
    response = provider.generate_code_suggestion(prompt, temperature=0.7)

    # Parse response
    return parse_code_modification(response.content)


def parse_code_modification(response_text: str) -> CodeModification:
    """
    Parse AI response to extract code modification.

    Args:
        response_text: Raw text response from AI

    Returns:
        CodeModification object

    Raises:
        ValueError: If response format is invalid
    """
    # Try to extract JSON from response
    # AI might wrap it in markdown code blocks
    text = response_text.strip()

    # Remove markdown code blocks if present
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    # Parse JSON
    try:
        data = json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in AI response: {e}")

    # Validate required fields
    required_fields = ["file_path", "code", "todo_line", "todo_task", "explanation"]
    missing = [field for field in required_fields if field not in data]

    if missing:
        raise ValueError(
            f"Missing required fields in AI response: {', '.join(missing)}"
        )

    # Create modification object
    return CodeModification(
        file_path=data["file_path"],
        code=data["code"],
        todo_line=int(data["todo_line"]),
        todo_task=data["todo_task"],
        explanation=data["explanation"],
    )


def apply_code_modification(
    modification: CodeModification, project_path: Path, dry_run: bool = False
) -> Path:
    """
    Apply code modification to the project.

    Args:
        modification: CodeModification object
        project_path: Path to project root
        dry_run: If True, don't actually write files

    Returns:
        Absolute path to the modified file

    Raises:
        ValueError: If file path is invalid
    """
    # Resolve file path
    file_path = project_path / modification.file_path

    # Ensure parent directory exists
    if not dry_run:
        file_path.parent.mkdir(parents=True, exist_ok=True)

    # Write the file
    if not dry_run:
        file_path.write_text(modification.code, encoding="utf-8")

    return file_path
