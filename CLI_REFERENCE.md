# CodeTandem CLI Reference

Complete command reference for the CodeTandem CLI.

## Global Options

```bash
codetandem -v, --version    # Show version number
codetandem -h, --help       # Display help
```

## Configuration Commands

### `config`

Manage CodeTandem configuration (stored in `~/.config/codetandem/config.json`).

```bash
# Set a configuration value
codetandem config set <key> <value>

# Get a configuration value
codetandem config get <key>

# Show all configuration
codetandem config show

# Clear a configuration value
codetandem config clear <key>
```

**Examples:**
```bash
codetandem config set provider openai
codetandem config set model gpt-4
codetandem config get provider
codetandem config show
```

## Project Initialization

### `init`

Initialize a CodeTandem learning project in the current directory.

```bash
codetandem init [options]
```

**Options:**
- None required - creates `.codetandem/` directory with default files

**Creates:**
- `.codetandem/lrd.md` - Learning Requirements Document template
- `.codetandem/settings.json` - Learning preferences
- `.codetandem/` directory structure

**Example:**
```bash
cd ~/my-learning-project
codetandem init
```

## Curriculum Management

### `generate-curriculum`

Generate curriculum from Learning Requirements Document.

```bash
codetandem generate-curriculum [options]
```

**Alias:** `codetandem generate`

**Options:**
- `--lrd <path>` - Path to LRD file (default: `.codetandem/lrd.md`)
- `--output <path>` - Output path for modules.json (default: `modules.json`)

**Example:**
```bash
codetandem generate
codetandem generate-curriculum --lrd custom-lrd.md
```

### `list`

List all curriculum modules with completion status.

```bash
codetandem list [options]
```

**Options:**
- `--detailed` - Show detailed information

**Example:**
```bash
codetandem list
```

## Learning Commands

### `review`

**PRIMARY COMMAND** - Review code with AI and track progress automatically.

```bash
codetandem review <file> [options]
```

**Options:**
- `--todo <text>` - Review specific TODO
- `--no-auto-progress` - Disable automatic progression

**How it works:**
1. Extracts TODO comments from your code
2. Gets AI review and scoring (0-10)
3. Applies proficiency penalties (hints/solutions)
4. Records objective completion if TODO has ID
5. Auto-completes module when all objectives done + score ≥ 7.0
6. Auto-advances to next module

**Example:**
```bash
codetandem review src/Counter.tsx
codetandem review src/App.tsx --todo "Implement state"
```

**TODO ID Format:**
```typescript
// TODO: [obj-1] Implement counter state
// TODO: [obj-2] Add increment function
```

### `hint`

Get a hint for the current objective. **WARNING: -0.5 penalty per hint**

```bash
codetandem hint [file] [options]
```

**Options:**
- `--todo <text>` - Get hint for specific TODO

**Example:**
```bash
codetandem hint
codetandem hint src/Counter.tsx
codetandem hint --todo "Implement useState"
```

### `solve`

Get AI-generated solution. **WARNING: -1.5 penalty per solution**

```bash
codetandem solve [file] [options]
```

**Options:**
- `--confirm` - **Required** to proceed (prevents accidental usage)
- `--todo <text>` - Get solution for specific TODO

**Example:**
```bash
codetandem solve --confirm
codetandem solve src/Counter.tsx --confirm
codetandem solve --todo "Add increment" --confirm
```

### `status`

Show current project status and progress.

```bash
codetandem status [options]
```

**Shows:**
- Current module
- Completed objectives
- Remaining objectives
- Proficiency score
- Penalties (hints/solutions used)

**Example:**
```bash
codetandem status
```

## Settings Management

### `settings`

View or modify learning preferences.

```bash
codetandem settings [options]
```

**Options:**
- `--coding-bias <value>` - Set coding bias: `guided`, `balanced`, `independent`
- `--task-difficulty <value>` - Set difficulty: `gentle`, `progressive`, `challenging`
- `--auto-review <boolean>` - Enable/disable auto-review
- `--detailed-feedback <boolean>` - Enable/disable detailed feedback

**Example:**
```bash
# View current settings
codetandem settings

# Update settings
codetandem settings --coding-bias independent
codetandem settings --task-difficulty challenging
codetandem settings --auto-review true
```

## Other Commands

### `set-level`

Override the difficulty level for current session.

```bash
codetandem set-level <level>
```

**Levels:**
- `easy` - Gentle learning pace
- `medium` - Balanced progression
- `hard` - Challenging tasks

**Example:**
```bash
codetandem set-level medium
```

### `info`

Display project information.

```bash
codetandem info
```

**Shows:**
- Project name
- Total modules
- Current module
- Completion percentage

### `start`

Start AI-assisted coding session (legacy command).

```bash
codetandem start [options] [file]
```

**Note:** `review` command is now the primary workflow.

### `submit`

Submit your solution for review (legacy command).

```bash
codetandem submit [options]
```

**Note:** `review` command now handles submission automatically.

### `test`

Run tests for the current task.

```bash
codetandem test
```

## Workflow Examples

### Complete Learning Workflow

```bash
# 1. Initialize project
cd ~/learn-react
codetandem init

# 2. Edit .codetandem/lrd.md with your learning goals

# 3. Generate curriculum
codetandem generate

# 4. Check status
codetandem status

# 5. Implement code with TODO IDs
# (Edit your files with TODO: [obj-1] format)

# 6. Review each objective
codetandem review src/Counter.tsx

# 7. Get hint if stuck (penalty applies)
codetandem hint src/Counter.tsx

# 8. Check progress
codetandem status

# 9. Repeat until module complete
```

### Quick Review Workflow

```bash
# Implement objective
# Add: // TODO: [obj-1] Description

# Review
codetandem review src/MyComponent.tsx

# If passed (score ≥ 7.0), objective marked complete
# If all objectives complete, module auto-completes
# System auto-advances to next module
```

### Getting Help

```bash
# Prefer hints over solutions (smaller penalty)
codetandem hint                    # -0.5 penalty

# Only use solution when really stuck
codetandem solve --confirm         # -1.5 penalty

# Check how penalties affect your score
codetandem status
```

## File Locations

### Project Files
```
your-project/
├── .codetandem/
│   ├── lrd.md              # Learning Requirements Document
│   └── settings.json       # Learning preferences
├── modules.json            # Generated curriculum modules
└── codetandem.state.json   # Progress tracking
```

### Global Config
```
~/.config/codetandem/
└── config.json             # Global configuration
```

## Proficiency Scoring

### Score Calculation
```
Final Score = Base Score - Penalties

Base Score: 0-10 (AI evaluation)
Hint Penalty: -0.5 each
Solution Penalty: -1.5 each
Max Penalty: -3.0
```

### Progression Requirements
- Complete **ALL objectives** in module
- Achieve **score ≥ 7.0** (after penalties)

### Example Scenarios

**Scenario 1: Pass without help**
```
Base Score: 8.0
Hints: 0
Solutions: 0
Final Score: 8.0 ✓ PASS
```

**Scenario 2: Pass with hints**
```
Base Score: 9.0
Hints: 2 (-1.0)
Solutions: 0
Final Score: 8.0 ✓ PASS
```

**Scenario 3: Fail - need retry**
```
Base Score: 7.0
Hints: 1 (-0.5)
Solutions: 1 (-1.5)
Final Score: 5.0 ✗ FAIL (need ≥ 7.0)
```

## Tips & Best Practices

1. **Use TODO IDs** - Always format TODOs as `// TODO: [obj-1] Description`
2. **Review frequently** - Review after implementing each objective
3. **Check status often** - Monitor progress and penalties
4. **Prefer hints** - Hints have smaller penalty than solutions
5. **Complete all objectives** - Can't progress until all done
6. **Understand penalties** - They're transparent and tracked
7. **Use MCP for AI** - Let AI agents handle the workflow via MCP

## Getting Help

```bash
# Command help
codetandem --help
codetandem <command> --help

# Examples
codetandem config --help
codetandem review --help
```

## See Also

- **[MCP_USAGE_GUIDE.md](./MCP_USAGE_GUIDE.md)** - MCP server for AI agents
- **[PROFICIENCY_SYSTEM.md](./PROFICIENCY_SYSTEM.md)** - Proficiency details
- **[README.md](./README.md)** - Main documentation
