import typer
from codetandem.state import load_state, update_state, get_current_module_id
from codetandem.providers.factory import get_ai_provider
from codetandem.modules import load_modules

app = typer.Typer()


@app.callback(invoke_without_command=True)
def main():
    """Take the module assessment."""
    try:
        state = load_state(".taskmaster/state.json")
        module_id = get_current_module_id(state)

        # Load modules
        modules = load_modules("modules.json")
        module = next((m for m in modules if m.id == module_id), None)

        if not module:
            print(f"Module with id {module_id} not found.")
            return

        # Get AI provider
        ai_provider = get_ai_provider()

        # Construct prompt
        prompt = f"I have just completed the '{module.title}' module. Please provide a comprehensive coding challenge that integrates the following objectives:\n"
        for objective in module.objectives:
            prompt += f"- {objective}\n"
        prompt += "\nThe challenge should be a single, unscaffolded task. Provide only the code for the challenge in a file named module_test.py."

        # Get challenge from AI
        messages = [{"role": "user", "content": prompt}]
        response = ai_provider.chat(messages)
        challenge_code = response.content

        # Save challenge to file
        with open("module_test.py", "w") as f:
            f.write(challenge_code)

        # Update state
        update_state(".taskmaster/state.json", assessment_pending=True)

        print("Module assessment has been generated in `module_test.py`.")
        print(
            "Implement the solution and then run `codetandem submit` to have it graded."
        )

    except FileNotFoundError as e:
        print(f"Error: {e}. Have you run `codetandem init`?")
    except ValueError as e:
        print(f"Error: {e}")
