import typer
from codetandem.state import (
    load_state,
    get_current_module_id,
    get_hint_count,
    update_state,
)
from codetandem.providers.factory import get_ai_provider
from codetandem.taskmaster_integration import TaskmasterParser

app = typer.Typer()


@app.callback(invoke_without_command=True)
def main():
    """Get a hint for the current task."""
    try:
        state = load_state(".taskmaster/state.json")
        module_id = get_current_module_id(state)
        hint_count = get_hint_count(state, module_id)

        # Get task description
        parser = TaskmasterParser()
        tasks = parser.parse_tasks_json(".taskmaster/tasks/tasks.json")
        task = next((t for t in tasks if t.id == module_id), None)

        if not task:
            print(f"Task with id {module_id} not found.")
            return

        # Get AI provider
        ai_provider = get_ai_provider()

        # Construct prompt
        prompt = f"I am working on the following task: {task.title}.\n\n{task.description}\n\n"
        if hint_count == 0:
            prompt += "Please provide a general hint to get me started."
        elif hint_count == 1:
            prompt += "Please provide a more specific hint."
        else:
            prompt += "Please provide a very detailed hint."

        # Get hint from AI
        messages = [{"role": "user", "content": prompt}]
        response = ai_provider.chat(messages)

        print(response.content)

        # Update hint count
        update_state(".taskmaster/state.json", hint_count=hint_count + 1)

    except FileNotFoundError as e:
        print(f"Error: {e}. Have you run `codetandem init`?")
    except ValueError as e:
        print(f"Error: {e}")
