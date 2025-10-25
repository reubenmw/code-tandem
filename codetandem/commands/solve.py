import typer
from codetandem.state import load_state, get_current_module_id, update_state
from codetandem.providers.factory import get_ai_provider
from codetandem.taskmaster_integration import TaskmasterParser
from codetandem.scanner import get_file_tree
import os

app = typer.Typer()


@app.callback(invoke_without_command=True)
def main():
    """Solve the current task using AI."""
    try:
        state = load_state(".taskmaster/state.json")
        module_id = get_current_module_id(state)

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
        prompt = f"I am working on the following task: {task.title}.\n\n{task.description}\n\nPlease provide the code to solve this task. The code should be a direct replacement for the '// TODO' comment in the source code."

        # Get solution from AI
        messages = [{"role": "user", "content": prompt}]
        response = ai_provider.chat(messages)
        solution = response.content

        # Find file with TODO
        project_path = state.get("metadata", {}).get("project_path", ".")
        todo_file = find_todo_file(project_path)

        if not todo_file:
            print("Could not find a file with a '// TODO' comment.")
            return

        # Replace TODO with solution
        replace_todo_in_file(todo_file, solution)

        # Update task status
        update_state(".taskmaster/state.json", completed_module_id=module_id)
        print(f"Task {module_id} has been solved and marked as skipped.")

    except FileNotFoundError as e:
        print(f"Error: {e}. Have you run `codetandem init`?")
    except ValueError as e:
        print(f"Error: {e}")


def find_todo_file(project_path):
    for root, _, files in os.walk(project_path):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                with open(file_path, "r") as f:
                    if "// TODO" in f.read():
                        return file_path
    return None


def replace_todo_in_file(file_path, solution):
    with open(file_path, "r") as f:
        content = f.read()

    new_content = content.replace("// TODO", solution)

    with open(file_path, "w") as f:
        f.write(new_content)
