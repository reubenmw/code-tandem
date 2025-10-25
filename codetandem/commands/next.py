"""Next command - core tandem coding loop."""

from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from typing_extensions import Annotated

from codetandem.providers.factory import get_ai_provider
from codetandem.tandem import (
    apply_code_modification,
    format_module_info,
    generate_code_with_ai,
    get_next_objective_index,
    load_project_context,
)
from codetandem.state import get_skill_score

app = typer.Typer(help="Generate next code task with AI")
console = Console()


@app.callback(invoke_without_command=True)
def next_command(
    project: Annotated[
        str, typer.Option("--project", "-p", help="Path to the project directory")
    ] = ".",
    file: Annotated[
        str, typer.Option("--file", "-f", help="Target file to modify (optional)")
    ] = None,
    dry_run: Annotated[
        bool,
        typer.Option(
            "--dry-run", help="Show what would be done without making changes"
        ),
    ] = False,
):
    """
    Generate the next coding task with AI assistance.

    The AI will analyze your current learning objective and write
    foundational code with a TODO for you to complete.
    """
    try:
        # Load project context
        console.print("[cyan]Loading project context...[/cyan]")
        context = load_project_context(project)

        # Display current module info
        console.print()
        console.print(
            Panel(
                format_module_info(context), title="Current Module", border_style="blue"
            )
        )
        console.print()

        # Get next objective
        objective_index = get_next_objective_index(context)
        if objective_index is None:
            console.print("[yellow]No objectives found in current module.[/yellow]")
            raise typer.Exit(0)

        # Get skill score for current module
        skill_score = get_skill_score(context.state, context.current_module_id)
        difficulty_override = context.state.get("difficulty_override")

        if difficulty_override:
            level_desc = f"MANUAL OVERRIDE ({difficulty_override.upper()})"
            skill_level = {"easy": 2.0, "medium": 5.0, "hard": 8.0}.get(
                difficulty_override, skill_score
            )
        else:
            if skill_score < 3.0:
                level_desc = "BEGINNER (detailed scaffolding)"
            elif skill_score < 7.0:
                level_desc = "INTERMEDIATE (goal-oriented guidance)"
            else:
                level_desc = "ADVANCED (conceptual guidance)"
            skill_level = skill_score
        console.print(f"[cyan]Scaffolding level:[/cyan] {level_desc}")

        # Get AI provider
        console.print("[cyan]Initializing AI provider...[/cyan]")
        try:
            provider = get_ai_provider()
        except ValueError as e:
            console.print(f"[red]Error:[/red] {e}")
            raise typer.Exit(1)

        # Prepare file content if file specified
        file_content = None
        target_file = None

        if file:
            target_file = Path(file)
            file_path = context.project_path / target_file

            if file_path.exists():
                file_content = file_path.read_text(encoding="utf-8")
                console.print(f"[cyan]Analyzing existing file:[/cyan] {file}")
            else:
                console.print(f"[cyan]Creating new file:[/cyan] {file}")
                file_content = ""

        # Generate code with AI
        console.print("[cyan]Generating code with AI...[/cyan]")

        try:
            modification = generate_code_with_ai(
                provider,
                context,
                target_file=target_file,
                file_content=file_content,
                objective_index=objective_index,
                skill_level=skill_level,
            )
        except Exception as e:
            console.print(f"[red]Error generating code:[/red] {e}")
            raise typer.Exit(1)

        # Display what will be done
        console.print()
        console.print(
            Panel(
                modification.explanation, title="AI Explanation", border_style="green"
            )
        )

        console.print()
        console.print(f"[bold]Target File:[/bold] {modification.file_path}")
        console.print(f"[bold]TODO Line:[/bold] {modification.todo_line}")
        console.print(f"[bold]TODO Task:[/bold] {modification.todo_task}")

        if dry_run:
            console.print()
            console.print("[yellow]Dry run - no files modified[/yellow]")
            console.print()
            console.print("[bold]Generated Code:[/bold]")
            console.print(modification.code)
            raise typer.Exit(0)

        # Apply the modification
        console.print()
        console.print("[cyan]Applying changes...[/cyan]")

        try:
            result_path = apply_code_modification(modification, context.project_path)

            console.print(f"[green]✓[/green] File written: {result_path}")
            console.print()
            console.print(
                Panel(
                    f"[bold]Next Step:[/bold] Open {modification.file_path}:{modification.todo_line}\n"
                    f"[bold]TODO:[/bold] {modification.todo_task}",
                    title="Your Task",
                    border_style="yellow",
                )
            )

        except Exception as e:
            console.print(f"[red]Error applying changes:[/red] {e}")
            raise typer.Exit(1)

    except FileNotFoundError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)
    except ValueError as e:
        console.print(f"[red]Error:[/red] {e}")
        raise typer.Exit(1)
