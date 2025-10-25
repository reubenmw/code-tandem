"""Configuration management commands."""

import typer
from rich.console import Console
from rich.table import Table
from typing_extensions import Annotated

from codetandem.config import get_config_manager
from codetandem.secrets import delete_api_key, get_api_key, set_api_key

app = typer.Typer(help="Manage CodeTandem configuration")
console = Console()


@app.command("set")
def config_set(
    key: Annotated[
        str, typer.Argument(help="Configuration key (provider, model, api_key)")
    ],
    value: Annotated[str, typer.Argument(help="Configuration value")],
):
    """Set a configuration value."""
    config_manager = get_config_manager()

    if key == "api_key":
        # Get the current provider to store the API key for
        provider = config_manager.get_provider()
        if not provider:
            console.print(
                "[red]Error:[/red] No provider set. Please set a provider first with: "
                "[cyan]codetandem config set provider <name>[/cyan]"
            )
            raise typer.Exit(1)

        set_api_key(provider, value)
        console.print(
            f"[green]✓[/green] API key securely stored for provider: {provider}"
        )
    elif key == "provider":
        config_manager.set_provider(value)
        console.print(f"[green]✓[/green] Provider set to: {value}")
    elif key == "model":
        config_manager.set_model(value)
        console.print(f"[green]✓[/green] Model set to: {value}")
    else:
        # Generic config value
        config_manager.set_config_value(key, value)
        console.print(f"[green]✓[/green] {key} set to: {value}")


@app.command("get")
def config_get(
    key: Annotated[
        str, typer.Argument(help="Configuration key (provider, model, api_key)")
    ],
):
    """Get a configuration value."""
    config_manager = get_config_manager()

    if key == "api_key":
        provider = config_manager.get_provider()
        if not provider:
            console.print("[red]Error:[/red] No provider set.")
            raise typer.Exit(1)

        api_key = get_api_key(provider)
        if api_key:
            # Show only first few characters for security
            masked_key = api_key[:8] + "..." if len(api_key) > 8 else "***"
            console.print(f"API key for {provider}: {masked_key}")
        else:
            console.print(f"[yellow]No API key set for provider: {provider}[/yellow]")
    elif key == "provider":
        value = config_manager.get_provider()
        if value:
            console.print(f"Provider: {value}")
        else:
            console.print("[yellow]No provider set[/yellow]")
    elif key == "model":
        value = config_manager.get_model()
        if value:
            console.print(f"Model: {value}")
        else:
            console.print("[yellow]No model set[/yellow]")
    else:
        value = config_manager.get_config_value(key)
        if value:
            console.print(f"{key}: {value}")
        else:
            console.print(f"[yellow]No value set for: {key}[/yellow]")


@app.command("show")
def config_show():
    """Show all configuration values."""
    config_manager = get_config_manager()

    table = Table(title="CodeTandem Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    # Provider
    provider = config_manager.get_provider()
    table.add_row("Provider", provider or "[dim]not set[/dim]")

    # Model
    model = config_manager.get_model()
    table.add_row("Model", model or "[dim]not set[/dim]")

    # API Key
    if provider:
        api_key = get_api_key(provider)
        if api_key:
            masked_key = api_key[:8] + "..." if len(api_key) > 8 else "***"
            table.add_row("API Key", masked_key)
        else:
            table.add_row("API Key", "[dim]not set[/dim]")
    else:
        table.add_row("API Key", "[dim]not set[/dim]")

    console.print(table)


@app.command("clear")
def config_clear(
    key: Annotated[
        str,
        typer.Argument(help="Configuration key to clear (provider, model, api_key)"),
    ],
):
    """Clear a configuration value."""
    config_manager = get_config_manager()

    if key == "api_key":
        provider = config_manager.get_provider()
        if not provider:
            console.print("[red]Error:[/red] No provider set.")
            raise typer.Exit(1)

        delete_api_key(provider)
        console.print(f"[green]✓[/green] API key cleared for provider: {provider}")
    elif key == "provider":
        config_manager.set_config_value("provider", None)
        console.print("[green]✓[/green] Provider cleared")
    elif key == "model":
        config_manager.set_config_value("model", None)
        console.print("[green]✓[/green] Model cleared")
    else:
        config_manager.set_config_value(key, None)
        console.print(f"[green]✓[/green] {key} cleared")
