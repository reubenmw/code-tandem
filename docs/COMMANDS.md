# CodeTandem Command Reference

Complete reference for all CodeTandem CLI commands.

## Table of Contents

- [Project Management](#project-management)
- [Coding Session](#coding-session)
- [Progress Tracking](#progress-tracking)
- [Configuration](#configuration)
- [Utilities](#utilities)

## Project Management

### `init`

Initialize a new CodeTandem project in the current directory.

```bash
codetandem init [options]
```

**Options:**
- `--force, -f` - Overwrite existing configuration
- `--curriculum <path>` - Path to curriculum file (default: `./curriculum.md`)
- `--no-generate` - Skip automatic generation of modules.json

**Examples:**
```bash
# Standard initialization
codetandem init

# Force reinitialize existing project
codetandem init --force

# Initialize with custom curriculum location
codetandem init --curriculum docs/my-curriculum.md
```

**What it creates:**
- `.codetandem/` - Configuration directory
- `curriculum.md` - Sample curriculum template
- `modules.json` - Parsed curriculum structure
- `codetandem.state.json` - Progress tracking file

---

### `generate`

Generate or regenerate `modules.json` from your curriculum file.

```bash
codetandem generate [options]
```

**Options:**
- `--curriculum <path>` - Path to curriculum markdown file
- `--output <path>` - Output path for modules.json
- `--validate` - Validate curriculum format without generating

**Examples:**
```bash
# Generate with defaults
codetandem generate

# Generate from custom curriculum
codetandem generate --curriculum docs/advanced-curriculum.md

# Validate curriculum format
codetandem generate --validate
```

**Curriculum Format:**
```markdown
# Module Title

## Objective 1
- Sub-task
- Another sub-task

## Objective 2
- Task description
```

---

## Coding Session

### `start`

Begin a coding session with AI-powered assistance.

```bash
codetandem start [file] [options]
```

**Arguments:**
- `file` - Path to source file (optional)

**Options:**
- `--objective <index>` - Focus on specific objective (0-based)
- `--module <id>` - Override current module
- `--interactive, -i` - Interactive mode with prompts
- `--temperature <value>` - AI temperature (0.0-1.0, default: 0.7)

**Examples:**
```bash
# Start with current module context
codetandem start

# Start with specific file
codetandem start src/calculator.js

# Focus on second objective
codetandem start src/app.js --objective 1

# Use lower temperature for more focused responses
codetandem start --temperature 0.3
```

**How it works:**
1. Reads your current module and objectives
2. Scans file for TODO comments
3. Provides context-aware coding suggestions
4. Adapts guidance based on your skill level

---

### `review`

Get AI-powered code review and feedback.

```bash
codetandem review <file> [options]
```

**Arguments:**
- `file` - Path to source file to review

**Options:**
- `--todo <text>` - Review specific TODO
- `--objective <index>` - Review against specific objective
- `--detailed` - Get detailed analysis
- `--temperature <value>` - AI temperature (default: 0.3)

**Examples:**
```bash
# Review entire file
codetandem review src/calculator.js

# Review specific TODO
codetandem review src/app.js --todo "implement validation"

# Get detailed feedback
codetandem review src/utils.js --detailed
```

**Review provides:**
- Code quality assessment
- Bug identification
- Best practice suggestions
- Skill score update
- Objective completion feedback

---

### `hint`

Request a hint for the current objective.

```bash
codetandem hint [options]
```

**Options:**
- `--level <number>` - Hint detail level (1-3)
  - Level 1: Gentle nudge
  - Level 2: More specific guidance
  - Level 3: Detailed explanation
- `--objective <index>` - Get hint for specific objective

**Examples:**
```bash
# Get basic hint
codetandem hint

# Get detailed hint
codetandem hint --level 3

# Hint for specific objective
codetandem hint --objective 2
```

---

## Progress Tracking

### `status`

Display current project status and progress.

```bash
codetandem status [options]
```

**Options:**
- `--detailed, -d` - Show detailed information
- `--json` - Output in JSON format

**Examples:**
```bash
# Show basic status
codetandem status

# Show detailed status
codetandem status --detailed

# Get JSON output for scripts
codetandem status --json
```

**Output includes:**
- Current module and objective
- Skill score
- Completed modules
- Total progress percentage
- Hint count

---

### `complete`

Mark the current module as completed.

```bash
codetandem complete [options]
```

**Options:**
- `--module <id>` - Complete specific module
- `--auto-next` - Automatically move to next module

**Examples:**
```bash
# Complete current module
codetandem complete

# Complete specific module
codetandem complete --module loops

# Complete and move to next
codetandem complete --auto-next
```

---

### `next`

Move to the next module in the curriculum.

```bash
codetandem next [options]
```

**Options:**
- `--skip-check` - Skip completion check for current module

**Examples:**
```bash
# Move to next module
codetandem next

# Skip without completing current
codetandem next --skip-check
```

---

### `goto`

Jump to a specific module.

```bash
codetandem goto <module-id>
```

**Arguments:**
- `module-id` - ID of the module to jump to

**Examples:**
```bash
# Jump to specific module
codetandem goto functions

# Jump to advanced topics
codetandem goto advanced-concepts
```

**Tip:** Use `codetandem list` to see available module IDs.

---

### `list`

List all modules in the curriculum.

```bash
codetandem list [options]
```

**Options:**
- `--completed` - Show only completed modules
- `--remaining` - Show only remaining modules
- `--with-objectives` - Include objectives in listing

**Examples:**
```bash
# List all modules
codetandem list

# List remaining work
codetandem list --remaining

# List with full details
codetandem list --with-objectives
```

---

## Configuration

### `config show`

Display current configuration.

```bash
codetandem config show [options]
```

**Options:**
- `--secrets` - Show full API keys (default: masked)

**Examples:**
```bash
# Show configuration
codetandem config show

# Show with full API keys
codetandem config show --secrets
```

---

### `config set-provider`

Set the AI provider.

```bash
codetandem config set-provider <provider>
```

**Arguments:**
- `provider` - Provider name: `openai`, `anthropic`, or `google`

**Examples:**
```bash
codetandem config set-provider openai
codetandem config set-provider anthropic
codetandem config set-provider google
```

---

### `config set-model`

Set the AI model.

```bash
codetandem config set-model <model>
```

**Arguments:**
- `model` - Model identifier

**Common Models:**

**OpenAI:**
- `gpt-4` - Most capable
- `gpt-4-turbo-preview` - Faster, cheaper
- `gpt-3.5-turbo` - Fast and economical

**Anthropic:**
- `claude-3-opus-20240229` - Most capable
- `claude-3-sonnet-20240229` - Balanced
- `claude-3-haiku-20240307` - Fast and economical

**Google:**
- `gemini-pro` - Standard model
- `gemini-pro-vision` - With vision capabilities

**Examples:**
```bash
codetandem config set-model gpt-4
codetandem config set-model claude-3-opus-20240229
codetandem config set-model gemini-pro
```

---

### `config set-key`

Set API key for a provider (stored securely).

```bash
codetandem config set-key <provider> <key>
```

**Arguments:**
- `provider` - Provider name: `openai`, `anthropic`, or `google`
- `key` - API key

**Examples:**
```bash
codetandem config set-key openai sk-...
codetandem config set-key anthropic sk-ant-...
codetandem config set-key google AIza...
```

**Security Note:** Keys are stored in your system's secure keychain (macOS Keychain, Windows Credential Vault, or Linux Secret Service).

---

### `config get`

Get a specific configuration value.

```bash
codetandem config get <key>
```

**Arguments:**
- `key` - Configuration key name

**Examples:**
```bash
codetandem config get provider
codetandem config get model
```

---

### `config set`

Set a custom configuration value.

```bash
codetandem config set <key> <value>
```

**Arguments:**
- `key` - Configuration key name
- `value` - Value to set

**Examples:**
```bash
codetandem config set difficultyOverride hard
codetandem config set autoSave true
```

---

### `config remove-key`

Remove stored API key.

```bash
codetandem config remove-key <provider>
```

**Arguments:**
- `provider` - Provider name

**Examples:**
```bash
codetandem config remove-key openai
codetandem config remove-key anthropic
```

---

## Utilities

### `--version`

Display CodeTandem version.

```bash
codetandem --version
```

---

### `--help`

Show help information.

```bash
codetandem --help
codetandem <command> --help
```

**Examples:**
```bash
# General help
codetandem --help

# Command-specific help
codetandem start --help
codetandem review --help
```

---

## Environment Variables

CodeTandem respects the following environment variables:

### `CODETANDEM_CONFIG_DIR`

Override default config directory location.

```bash
export CODETANDEM_CONFIG_DIR=~/.config/codetandem
```

### `CODETANDEM_LOG_LEVEL`

Set logging verbosity.

```bash
export CODETANDEM_LOG_LEVEL=debug  # debug, info, warn, error
```

### Provider API Keys

You can also provide API keys via environment variables:

```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=AIza...
```

These take precedence over stored keys.

---

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Configuration error
- `3` - File not found
- `4` - Invalid state
- `5` - API error
- `6` - Validation error

---

## Tips and Best Practices

### Efficient Workflow

1. **Start small**: Begin with `codetandem start` to understand the current objective
2. **Add TODOs**: Place TODO comments where you need help
3. **Iterate**: Work in small increments, reviewing frequently
4. **Track progress**: Use `status` command regularly

### Working with Multiple Files

```bash
# Review multiple files in sequence
for file in src/*.js; do
  codetandem review "$file"
done
```

### Scripting with CodeTandem

```bash
#!/bin/bash
# Auto-progress script

# Get current status
status=$(codetandem status --json)

# Check if ready to advance
if [ "$(echo $status | jq -r '.readyForNext')" = "true" ]; then
  codetandem complete --auto-next
fi
```

### Configuration Profiles

Switch between different configurations:

```bash
# Development profile
codetandem config set-provider openai
codetandem config set-model gpt-3.5-turbo

# Production/learning profile
codetandem config set-provider anthropic
codetandem config set-model claude-3-opus-20240229
```

---

## Troubleshooting Commands

### Reset Configuration

```bash
rm -rf .codetandem/
codetandem init --force
```

### Validate Setup

```bash
codetandem config show
codetandem generate --validate
codetandem status
```

### Debug Mode

```bash
CODETANDEM_LOG_LEVEL=debug codetandem start
```

---

For more detailed documentation, visit the [GitHub repository](https://github.com/reubenwestrop/code-tandem).
