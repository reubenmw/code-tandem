"""Main entry point for the codetandem CLI application."""

import typer
from typing_extensions import Annotated

from codetandem import __version__
from codetandem.commands import config, init, next, submit, hint, solve, set_level, test

app = typer.Typer(
    name="codetandem",
    help="AI-powered collaborative coding CLI tool",
    add_completion=False,
)

# Add subcommands
app.add_typer(config.app, name="config")
app.add_typer(init.app, name="init")
app.add_typer(next.app, name="next")
app.add_typer(submit.app, name="submit")
app.add_typer(hint.app, name="hint")
app.add_typer(solve.app, name="solve")
app.add_typer(set_level.app, name="set-level")
app.add_typer(test.app, name="test")


def version_callback(value: bool):
    """Print version and exit."""
    if value:
        typer.echo(f"codetandem version {__version__}")
        raise typer.Exit()


@app.callback()
def main(
    version: Annotated[
        bool,
        typer.Option(
            "--version",
            "-v",
            callback=version_callback,
            is_eager=True,
            help="Show version and exit",
        ),
    ] = False,
):
    """CodeTandem CLI - AI-powered collaborative coding."""
    pass


if __name__ == "__main__":
    app()
