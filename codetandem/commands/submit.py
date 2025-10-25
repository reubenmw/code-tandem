"""CLI command for submitting code for review."""

import asyncio
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown

from codetandem.code_parser import extract_todo_code, find_all_todos
from codetandem.linter import run_linter, format_lint_errors
from codetandem.review import review_code_with_ai, format_review_feedback
from codetandem.providers.factory import get_ai_provider
from codetandem.tandem import load_project_context
from codetandem.state import increment_skill_score, load_state, update_state
from codetandem.modules import load_modules
from codetandem.taskmaster_integration import (
    TaskmasterParser,
    PRDParser,
    create_curriculum_backlog_mapping,
)

app = typer.Typer(help="Submit code for review")
console = Console()


def async_runner(coro):
    """Helper to run async functions in CLI commands."""
    return asyncio.run(coro)


@app.command()
def main(
    file: Optional[str] = typer.Option(
        None,
        "--file",
        "-f",
        help="Specific file to review (default: auto-detect from last TODO)",
    ),
    project: str = typer.Option(
        ".", "--project", "-p", help="Path to project directory"
    ),
    skip_lint: bool = typer.Option(
        False, "--skip-lint", help="Skip static analysis/linting"
    ),
    todo_text: Optional[str] = typer.Option(
        None, "--todo", "-t", help="Specific TODO text to find (default: last TODO)"
    ),
    points: float = typer.Option(
        10.0, "--points", help="Points to award for successful submission"
    ),
):
    """
    Submit code for AI-powered review.

    This command will:
    1. Extract code from the last TODO comment
    2. Run static analysis/linting (if available)
    3. Submit to AI for code review
    4. Update skill score on success
    """
    console.print("\n[bold cyan]Code Tandem - Submit for Review[/bold cyan]\n")

    project_path = Path(project).resolve()

    # Load state
    state_path = project_path / "codetandem.state.json"
    state = load_state(state_path)

    if state.get("assessment_pending"):
        # Handle assessment submission
        console.print("\n[bold cyan]Submitting Module Assessment...[/bold cyan]\n")
        try:
            with open("module_test.py", "r") as f:
                solution = f.read()
        except FileNotFoundError:
            console.print("[red]Error: module_test.py not found.[/red]")
            raise typer.Exit(1)

        provider = get_ai_provider()
        current_module = context.current_module

        prompt = f"I have completed the capstone task for the '{current_module.title}' module. Please grade my solution.\n\nSolution:\n{solution}\n\nRespond with either 'pass' or 'fail', followed by your feedback."

        messages = [{"role": "user", "content": prompt}]
        response = provider.chat(messages)
        result = response.content.lower()

        if result.startswith("pass"):
            console.print(
                "\n[bold green]Congratulations! You have passed the module assessment.[/bold green]"
            )

            # Get current module
            current_module_id = context.current_module_id
            modules = load_modules("modules.json")
            current_module_index = next(
                (i for i, m in enumerate(modules) if m.id == current_module_id), -1
            )

            if current_module_index != -1 and current_module_index + 1 < len(modules):
                next_module = modules[current_module_index + 1]
                update_state(
                    state_path,
                    completed_module_id=current_module_id,
                    assessment_pending=False,
                    current_module_id=next_module.id,
                )
                console.print(
                    f"\n[bold cyan]You have unlocked the next module: {next_module.title}[/bold cyan]"
                )
            else:
                # All modules completed
                update_state(
                    state_path,
                    completed_module_id=current_module_id,
                    assessment_pending=False,
                )
                console.print(
                    "\n[bold green]Congratulations! You have completed all modules.[/bold green]"
                )
        else:
            console.print("\n[bold red]Module assessment failed.[/bold red]")
            console.print(response.content)

        raise typer.Exit(0)

    # Load project context
    try:
        context = load_project_context(project_path)
    except Exception as e:
        console.print(f"[red]Error loading project:[/red] {e}")
        raise typer.Exit(1)

    # Determine which file to review
    if not file:
        # Auto-detect: scan project for Python files with TODOs
        console.print("[yellow]No file specified. Searching for TODOs...[/yellow]")

        # Simple heuristic: look for .py files
        python_files = list(project_path.rglob("*.py"))

        # Filter out test files and __pycache__
        python_files = [
            f
            for f in python_files
            if "__pycache__" not in str(f) and not f.name.startswith("test_")
        ]

        # Find files with TODOs
        files_with_todos = []
        for py_file in python_files:
            todos = find_all_todos(str(py_file))
            if todos:
                files_with_todos.append((py_file, todos))

        if not files_with_todos:
            console.print("[red]No TODO comments found in project.[/red]")
            console.print("Add a TODO comment to indicate what code to review:")
            console.print("  [cyan]// TODO: Implement feature X[/cyan]")
            raise typer.Exit(1)

        # Use the first file with TODOs
        file, todos = files_with_todos[0]
        console.print(
            f"[green]Found {len(todos)} TODO(s) in {file.relative_to(project_path)}[/green]"
        )
    else:
        file = project_path / file

    # Extract code from TODO
    console.print(
        f"\n[bold]Extracting code from:[/bold] {Path(file).relative_to(project_path)}"
    )

    code_extraction = extract_todo_code(str(file), todo_text=todo_text)

    if not code_extraction:
        console.print("[red]Could not find TODO comment or extract code.[/red]")
        raise typer.Exit(1)

    console.print(f"[green]✓[/green] Found TODO: {code_extraction.todo_text}")
    console.print(
        f"[green]✓[/green] Extracted {len(code_extraction.code.splitlines())} lines of code"
    )

    # Run linter if not skipped
    if not skip_lint:
        console.print("\n[bold]Running static analysis...[/bold]")

        lint_result = run_linter(str(file))

        if not lint_result.success:
            console.print("[red]✗ Linting failed[/red]\n")
            console.print(format_lint_errors(lint_result.errors))
            console.print(
                "\n[yellow]Please fix linting errors before submitting.[/yellow]"
            )
            raise typer.Exit(1)

        if lint_result.errors:
            console.print(
                f"[yellow]⚠[/yellow] Found {len(lint_result.errors)} warnings"
            )
        else:
            console.print("[green]✓[/green] Static analysis passed")

    # Get AI provider
    try:
        provider = get_ai_provider()
    except Exception as e:
        console.print(f"[red]Error initializing AI provider:[/red] {e}")
        console.print(
            "\n[yellow]Make sure you have configured your AI provider:[/yellow]"
        )
        console.print("  codetandem config set provider openai")
        console.print("  codetandem config set api-key YOUR_API_KEY")
        raise typer.Exit(1)

    # Submit for AI review
    console.print("\n[bold]Submitting to AI for review...[/bold]")

    # Get current module info
    current_module = context.current_module
    module_context = f"Module: {current_module.title}"

    # Get current objective
    objective = None
    if current_module.objectives:
        objective = current_module.objectives[0]

    # Run async review
    async def do_review():
        return await review_code_with_ai(
            provider,
            code_extraction,
            module_context=module_context,
            objective=objective,
        )

    review_result = async_runner(do_review())

    # Display results
    console.print()
    feedback_md = format_review_feedback(review_result)
    console.print(
        Panel(Markdown(feedback_md), title="Review Results", border_style="cyan")
    )

    # Update skill score if successful
    if review_result.success:
        state_path = project_path / "codetandem.state.json"

        try:
            new_score = increment_skill_score(state_path, current_module.id, points)

            console.print(f"\n[green]✓ Submission successful! +{points} points[/green]")
            console.print(
                f"[cyan]Module '{current_module.title}' skill score:[/cyan] {new_score}"
            )

            # Check for module completion
            state = load_state(state_path)
            prd_parser = PRDParser()
            task_parser = TaskmasterParser()
            prd_sections = prd_parser.parse_prd(".taskmaster/docs/prd.txt")
            tasks = task_parser.parse_tasks_json(".taskmaster/tasks/tasks.json")
            mapping = create_curriculum_backlog_mapping(prd_sections, tasks)

            module_tasks = mapping.get(current_module.title, [])
            completed_tasks = state.get("completed_modules", [])

            if module_tasks and all(
                task_id in completed_tasks for task_id in module_tasks
            ):
                console.print(
                    "\n[bold green]Congratulations! You have completed all tasks in this module.[/bold green]"
                )
                console.print(
                    "Run [bold cyan]codetandem test[/bold cyan] to take the module assessment."
                )

        except Exception as e:
            console.print(
                f"\n[yellow]Warning: Could not update skill score:[/yellow] {e}"
            )
    else:
        console.print("\n[yellow]Please address the feedback and try again.[/yellow]")
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
