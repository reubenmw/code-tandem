import typer
from codetandem.state import update_state

app = typer.Typer()


@app.callback(invoke_without_command=True)
def main(
    level: str = typer.Argument(
        ..., help="The difficulty level to set (easy, medium, or hard)."
    ),
):
    """Set the difficulty level override."""
    if level not in ["easy", "medium", "hard"]:
        print("Invalid level. Please choose from easy, medium, or hard.")
        raise typer.Exit(code=1)

    try:
        update_state(".taskmaster/state.json", difficulty_override=level)
        print(f"Difficulty level override set to: {level}")
    except FileNotFoundError:
        print("State file not found. Have you run `codetandem init`?")
