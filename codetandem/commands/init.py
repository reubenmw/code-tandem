"""Project initialization command."""

from pathlib import Path
from typing import Optional, List

import typer
from rich.console import Console
from typing_extensions import Annotated

from codetandem.modules import generate_modules_json
from codetandem.state import generate_initial_state

app = typer.Typer(help="Initialize a CodeTandem project")
console = Console()


@app.callback(invoke_without_command=True)
def init(
    project: Annotated[
        str,
        typer.Option("--project", "-p", help="Path to the project directory to scan"),
    ] = ".",
    curriculum: Annotated[
        str,
        typer.Option("--curriculum", "-c", help="Path to the curriculum Markdown file"),
    ] = None,
    output_dir: Annotated[
        str,
        typer.Option(
            "--output",
            "-o",
            help="Output directory for generated files (default: project directory)",
        ),
    ] = None,
    docs: Annotated[
        Optional[List[str]],
        typer.Option(
            "--docs",
            help="Documentation URLs or file paths to ingest into vector database",
        ),
    ] = None,
    taskmaster: Annotated[
        Optional[str],
        typer.Option(
            "--taskmaster",
            help="Path to Taskmaster directory containing prd.md and tasks.json",
        ),
    ] = None,
):
    """
    Initialize a CodeTandem project.

    Scans the project directory, parses the curriculum file,
    and generates modules.json and codetandem.state.json files.
    """
    # Validate inputs
    if not curriculum:
        console.print("[red]Error:[/red] --curriculum/-c is required")
        console.print("Usage: codetandem init --curriculum path/to/curriculum.md")
        raise typer.Exit(1)

    project_path = Path(project).resolve()
    curriculum_path = Path(curriculum).resolve()

    if not project_path.exists():
        console.print(f"[red]Error:[/red] Project directory not found: {project_path}")
        raise typer.Exit(1)

    if not curriculum_path.exists():
        console.print(f"[red]Error:[/red] Curriculum file not found: {curriculum_path}")
        raise typer.Exit(1)

    # Determine output directory
    if output_dir:
        output_path = Path(output_dir).resolve()
    else:
        output_path = project_path

    output_path.mkdir(parents=True, exist_ok=True)

    console.print(f"[cyan]Initializing CodeTandem project...[/cyan]")
    console.print(f"  Project: {project_path}")
    console.print(f"  Curriculum: {curriculum_path}")
    console.print(f"  Output: {output_path}")
    console.print()

    # Generate modules.json
    modules_file = output_path / "modules.json"
    try:
        console.print("[cyan]Parsing curriculum...[/cyan]")
        modules_data = generate_modules_json(curriculum_path, modules_file)
        module_count = len(modules_data["modules"])
        console.print(
            f"[green]✓[/green] Generated modules.json ({module_count} modules)"
        )
    except Exception as e:
        console.print(f"[red]Error generating modules.json:[/red] {e}")
        raise typer.Exit(1)

    # Generate codetandem.state.json
    state_file = output_path / "codetandem.state.json"
    try:
        console.print("[cyan]Scanning project directory...[/cyan]")
        state_data = generate_initial_state(modules_file, project_path, state_file)
        console.print(f"[green]✓[/green] Generated codetandem.state.json")
        console.print(f"  Starting module: {state_data['current_module_id']}")
    except Exception as e:
        console.print(f"[red]Error generating state file:[/red] {e}")
        raise typer.Exit(1)

    # Handle --docs flag
    if docs:
        try:
            from codetandem.docs_ingestion import ingest_documentation
            from codetandem.vector_store import create_vector_store

            console.print()
            console.print("[cyan]Ingesting documentation...[/cyan]")

            # Ingest documentation
            chunks = ingest_documentation(docs)
            console.print(f"[green]✓[/green] Created {len(chunks)} document chunks")

            # Create vector store
            vector_store_path = output_path / ".codetandem" / "vector_store"
            vector_store = create_vector_store(str(vector_store_path))

            # Add documents to vector store
            texts = [chunk.content for chunk in chunks]
            metadatas = [chunk.metadata for chunk in chunks]
            vector_store.add_documents(texts, metadatas)

            console.print(
                f"[green]✓[/green] Vector store created at {vector_store_path}"
            )

        except ImportError as e:
            console.print(
                f"[yellow]Warning:[/yellow] Could not ingest documentation: {e}"
            )
            console.print(
                "  Install dependencies: pip install beautifulsoup4 requests sentence-transformers"
            )
        except Exception as e:
            console.print(
                f"[yellow]Warning:[/yellow] Error ingesting documentation: {e}"
            )

    # Handle --taskmaster flag
    if taskmaster:
        try:
            import json
            from codetandem.taskmaster_integration import (
                TaskmasterParser,
                PRDParser,
                create_curriculum_backlog_mapping,
            )

            console.print()
            console.print("[cyan]Processing Taskmaster integration...[/cyan]")

            taskmaster_path = Path(taskmaster).resolve()
            prd_file = taskmaster_path / "prd.md"
            tasks_file = taskmaster_path / "tasks.json"

            if not prd_file.exists():
                console.print(
                    f"[yellow]Warning:[/yellow] prd.md not found at {prd_file}"
                )
            elif not tasks_file.exists():
                console.print(
                    f"[yellow]Warning:[/yellow] tasks.json not found at {tasks_file}"
                )
            else:
                # Parse PRD and tasks
                prd_parser = PRDParser()
                task_parser = TaskmasterParser()

                prd_sections = prd_parser.parse_prd(prd_file)
                tasks = task_parser.parse_tasks_json(tasks_file)

                console.print(
                    f"[green]✓[/green] Parsed {len(prd_sections)} PRD sections"
                )
                console.print(f"[green]✓[/green] Parsed {len(tasks)} Taskmaster tasks")

                # Create curriculum-backlog mapping
                mapping = create_curriculum_backlog_mapping(prd_sections, tasks)

                # Add mapping to modules.json
                with open(modules_file, "r", encoding="utf-8") as f:
                    modules_data = json.load(f)

                modules_data["curriculum_backlog_map"] = mapping

                with open(modules_file, "w", encoding="utf-8") as f:
                    json.dump(modules_data, f, indent=2, ensure_ascii=False)

                console.print(
                    f"[green]✓[/green] Added curriculum-backlog mapping to modules.json"
                )
                console.print(f"  Mapped {len(mapping)} topics to tasks")

        except Exception as e:
            console.print(f"[yellow]Warning:[/yellow] Error processing Taskmaster: {e}")

    console.print()
    console.print("[green]✓ Project initialized successfully![/green]")
    console.print(f"  modules.json: {modules_file}")
    console.print(f"  codetandem.state.json: {state_file}")

    if docs:
        console.print(f"  vector_store: {output_path / '.codetandem' / 'vector_store'}")
    if taskmaster:
        console.print(
            f"  taskmaster mapping: {len(mapping) if taskmaster else 0} topics"
        )
