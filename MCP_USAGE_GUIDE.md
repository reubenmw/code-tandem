# CodeTandem MCP Server - Usage Guide

## Overview

The CodeTandem MCP (Model Context Protocol) server is the **PRIMARY interface** for AI agents to interact with CodeTandem. Instead of calling CLI commands, AI agents should use the MCP server for all learning management, code review, and proficiency tracking operations.

## Quick Start

### Installation

After building CodeTandem, the MCP server is available as:

```bash
codetandem-mcp
```

### Configure with Claude Desktop

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "codetandem": {
      "command": "npx",
      "args": ["-y", "codetandem-mcp"],
      "cwd": "/path/to/your/learning/project"
    }
  }
}
```

Or if you have CodeTandem installed globally:

```json
{
  "mcpServers": {
    "codetandem": {
      "command": "codetandem-mcp",
      "cwd": "/path/to/your/learning/project"
    }
  }
}
```

### Using with Other MCP Clients

The MCP server runs on stdio and follows the Model Context Protocol specification. It can be integrated with any MCP-compatible client.

## Available Tools

The MCP server provides 15 tools organized into 3 categories:

### Learning Management Tools

#### `codetandem_get_current_module`
Get the current learning module with objectives and progress.

**Parameters:** None

**Returns:**
```json
{
  "moduleId": "string",
  "title": "string",
  "objectives": ["string"],
  "proficiency": {
    "completedObjectives": 3,
    "totalObjectives": 5,
    "percentage": 60.0
  },
  "penalties": {
    "hintsUsed": 2,
    "solutionsUsed": 0,
    "totalPenalty": 1.0
  }
}
```

#### `codetandem_review_code`
**PRIMARY TOOL** - Submit code for AI review and proficiency scoring.

**Parameters:**
- `filePath` (string, required): Path to file to review
- `todoText` (string, optional): Specific TODO to review

**Returns:**
```json
{
  "success": true,
  "score": 8.5,
  "adjustedScore": 7.5,
  "penalty": 1.0,
  "feedback": "string",
  "suggestions": ["string"],
  "objectiveCompleted": true,
  "objectiveId": "obj-1",
  "moduleComplete": false,
  "nextModule": null
}
```

**Automatic Progression:**
- Records objective completion if TODO has ID format: `// TODO: [obj-1] Description`
- Auto-completes module when: `adjustedScore >= 7.0` AND all objectives complete
- Auto-advances to next module

#### `codetandem_get_hint`
Get AI-generated hint for current objective.

**Parameters:**
- `todoText` (string, optional): Specific objective to get hint for

**Returns:**
```json
{
  "hint": "string",
  "penaltyApplied": 0.5,
  "totalHints": 3,
  "totalSolutions": 0,
  "currentPenalty": 1.5
}
```

**Warning:** Each hint reduces final score by 0.5 points

#### `codetandem_get_solution`
Get AI-generated solution. Requires confirmation.

**Parameters:**
- `todoText` (string, optional): Specific objective
- `confirm` (boolean, required): Must be `true` to proceed

**Returns:**
```json
{
  "solution": "string",
  "penaltyApplied": 1.5,
  "warning": "Using solutions significantly impacts proficiency score"
}
```

**Warning:** Each solution reduces final score by 1.5 points

### Curriculum Management Tools

#### `codetandem_init`
Initialize a CodeTandem learning project.

**Parameters:**
- `projectName` (string, required): Name of the project
- `description` (string, optional): Project description

**Returns:**
```json
{
  "success": true,
  "filesCreated": [".codetandem/", ".codetandem/lrd.md", ".codetandem/settings.json"],
  "nextSteps": ["Edit lrd.md", "Run codetandem generate"]
}
```

#### `codetandem_list_modules`
List all curriculum modules with completion status.

**Parameters:** None

**Returns:**
```json
{
  "modules": [
    {
      "moduleId": "string",
      "title": "string",
      "status": "completed|in_progress|not_started",
      "proficiency": 85.0,
      "bestScore": 8.0
    }
  ],
  "currentModule": "string",
  "totalModules": 10,
  "completedModules": 3
}
```

#### `codetandem_update_settings`
Update learning preferences.

**Parameters:**
- `codingBias` (string, optional): "guided" | "balanced" | "independent"
- `taskDifficulty` (string, optional): "gentle" | "progressive" | "challenging"
- `autoReview` (boolean, optional): Enable auto-review
- `detailedFeedback` (boolean, optional): Enable detailed feedback

**Returns:**
```json
{
  "success": true,
  "settings": { /* updated settings */ }
}
```

### Proficiency Tracking Tools

#### `codetandem_get_proficiency_report`
Get detailed proficiency report for a module.

**Parameters:**
- `moduleId` (string, optional): Module ID (defaults to current module)

**Returns:**
```json
{
  "moduleId": "string",
  "moduleTitle": "string",
  "proficiency": {
    "totalObjectives": 5,
    "completedObjectives": 3,
    "percentage": 60.0
  },
  "penalties": {
    "totalHintsUsed": 2,
    "totalSolutionsUsed": 0,
    "totalPenalty": 1.0,
    "breakdown": {
      "hintPenalty": 1.0,
      "solutionPenalty": 0.0
    }
  },
  "bestScore": 7.5,
  "attempts": 3,
  "objectives": [
    {
      "objectiveId": "obj-1",
      "objectiveText": "string",
      "score": 8.0,
      "completedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "canProgress": true
}
```

#### `codetandem_get_overall_progress`
Get overall learning progress across all modules.

**Parameters:** None

**Returns:**
```json
{
  "overview": {
    "totalModules": 10,
    "completedModules": 3,
    "currentModule": "string",
    "progressPercentage": 30.0,
    "averageProficiency": 75.5
  },
  "penalties": {
    "totalHintsUsed": 5,
    "totalSolutionsUsed": 1,
    "totalPenalty": 4.0
  },
  "modules": [/* module reports */]
}
```

#### `codetandem_get_remaining_objectives`
Get list of objectives still to be completed.

**Parameters:** None

**Returns:**
```json
{
  "moduleId": "string",
  "moduleTitle": "string",
  "totalObjectives": 5,
  "completedObjectives": 2,
  "remainingObjectives": [
    {
      "objectiveId": "obj-3",
      "description": "string",
      "todoFormat": "// TODO: [obj-3] Description"
    }
  ],
  "allComplete": false
}
```

#### `codetandem_reset_module_proficiency`
Reset proficiency tracking for a module (for retrying).

**Parameters:**
- `moduleId` (string, optional): Module ID (defaults to current)
- `confirm` (boolean, required): Must be `true` to proceed

**Returns:**
```json
{
  "success": true,
  "message": "string",
  "moduleId": "string"
}
```

**Warning:** This deletes all objective completions, scores, and penalty tracking

## Available Resources

Resources provide read-only access to CodeTandem data:

### `codetandem://state`
Current learning state including progress and completed modules.

### `codetandem://curriculum`
Complete curriculum with all modules and completion status.

### `codetandem://settings`
Current CodeTandem settings and preferences.

### `codetandem://module/{moduleId}`
Detailed information about a specific module including objectives and progress.

## Common Workflows

### 1. Starting a New Learning Project

```typescript
// Initialize project
await use_mcp_tool("codetandem_init", {
  projectName: "React Fundamentals",
  description: "Learn React basics"
});

// User edits .codetandem/lrd.md with curriculum
// User runs: codetandem generate

// Start learning
const current = await use_mcp_tool("codetandem_get_current_module");
```

### 2. Code Review and Progression

```typescript
// Review code (PRIMARY workflow)
const review = await use_mcp_tool("codetandem_review_code", {
  filePath: "src/components/Counter.tsx"
});

// Check results
if (review.objectiveCompleted) {
  console.log(`Completed: ${review.objectiveId}`);
}

if (review.moduleComplete) {
  console.log(`Module complete! Next: ${review.nextModule.title}`);
}
```

### 3. Getting Help

```typescript
// Get hint (0.5 point penalty)
const hint = await use_mcp_tool("codetandem_get_hint", {
  todoText: "Implement useState hook"
});

// Or get solution (1.5 point penalty) - requires confirmation
const solution = await use_mcp_tool("codetandem_get_solution", {
  todoText: "Implement useState hook",
  confirm: true
});
```

### 4. Tracking Progress

```typescript
// Get current module proficiency
const proficiency = await use_mcp_tool("codetandem_get_proficiency_report");

// Get remaining objectives
const remaining = await use_mcp_tool("codetandem_get_remaining_objectives");

// Get overall progress
const overall = await use_mcp_tool("codetandem_get_overall_progress");
```

## Multi-Objective Completion System

### TODO ID Format

To track objective completion, use TODO IDs in your code:

```typescript
// TODO: [obj-1] Implement basic counter state
const [count, setCount] = useState(0);

// TODO: [obj-2] Add increment functionality
const increment = () => setCount(count + 1);

// TODO: [obj-3] Add decrement functionality
const decrement = () => setCount(count - 1);
```

### Progression Requirements

To complete a module, you must:

1. **Complete ALL objectives** (not just one)
2. **Achieve score ≥ 7.0** (after penalties)

The system automatically:
- Records each objective completion when you review code with TODO IDs
- Applies penalties for hints (-0.5) and solutions (-1.5)
- Completes module when both conditions met
- Advances to next module immediately

## Proficiency Scoring

### Base Score
AI evaluates code quality on 0-10 scale based on:
- Correctness
- Code quality
- Best practices
- Learning objectives met

### Penalties
- Each **hint**: -0.5 points
- Each **solution**: -1.5 points
- **Maximum penalty**: -3.0 points

### Examples

```
Base Score: 9.0
Hints Used: 2 (penalty: -1.0)
Solutions Used: 0
Final Score: 8.0 ✓ (passes 7.0 threshold)

Base Score: 8.0
Hints Used: 3 (penalty: -1.5)
Solutions Used: 1 (penalty: -1.5)
Final Score: 5.0 ✗ (below 7.0 threshold, need to retry)
```

## Integration with AI Agents

### Recommended Usage Pattern

AI agents (like Claude Code) should:

1. **Use MCP server as primary interface** - Don't call CLI commands directly
2. **Review code frequently** - Use `codetandem_review_code` after implementing each objective
3. **Track progress** - Check remaining objectives to guide implementation
4. **Provide hints sparingly** - Ask user before using hint/solution tools
5. **Respect penalties** - Make users aware of proficiency impact

### Example Agent Prompt

```
When working on CodeTandem learning projects:
1. Check current module and objectives with codetandem_get_current_module
2. Review remaining objectives with codetandem_get_remaining_objectives
3. Implement code with TODO IDs matching objectives
4. Review each objective with codetandem_review_code
5. Track proficiency with codetandem_get_proficiency_report
6. Only use hints/solutions when user explicitly requests help
```

## Error Handling

All tools return error information in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common errors:
- **"No current module in progress"** - Project not initialized or curriculum not generated
- **"Module not found"** - Invalid module ID
- **"No TODO found in file"** - File doesn't contain TODO comments
- **"Must set confirm=true"** - Confirmation required for destructive operations

## Best Practices

1. **Always use TODO IDs** - Format: `// TODO: [obj-1] Description`
2. **Review frequently** - After implementing each objective
3. **Check remaining objectives** - Before starting new work
4. **Use hints judiciously** - They impact final score
5. **Understand penalties** - Transparent scoring system
6. **Track overall progress** - Monitor proficiency across modules
7. **Let AI agents drive** - MCP server is designed for AI interaction

## Debugging

### Enable MCP Server Logs

The server logs to stderr (stdout is used for MCP protocol):

```bash
# View server logs
codetandem-mcp 2> mcp-server.log
```

### Test MCP Connection

With Claude Desktop:
1. Open Claude Desktop
2. Check MCP server status in settings
3. Try listing tools: "What CodeTandem tools are available?"
4. Try calling a tool: "Get my current CodeTandem module"

## Advanced Topics

### Custom Learning Paths

Use tags or module filtering to create custom learning sequences:

```typescript
// List all modules
const modules = await use_mcp_tool("codetandem_list_modules");

// Filter for specific topics
const reactModules = modules.modules.filter(m => 
  m.title.toLowerCase().includes('react')
);
```

### Proficiency Thresholds

While default threshold is 7.0, you can adjust settings:

```typescript
await use_mcp_tool("codetandem_update_settings", {
  taskDifficulty: "challenging" // May affect scoring criteria
});
```

### State Management

Access raw state via resources:

```typescript
const state = await read_resource("codetandem://state");
const curriculum = await read_resource("codetandem://curriculum");
```

## Troubleshooting

### "Cannot find module" errors
- Ensure CodeTandem is built: `npm run build`
- Check MCP config points to correct directory
- Verify working directory has `.codetandem/` folder

### "No current module" errors
- Initialize project: `codetandem_init`
- Generate curriculum: CLI `codetandem generate`
- Check state: read `codetandem://state` resource

### Reviews not progressing
- Verify TODO IDs match format: `[obj-1]`, `[obj-2]`, etc.
- Check all objectives completed: `codetandem_get_remaining_objectives`
- Ensure score ≥ 7.0 after penalties: `codetandem_get_proficiency_report`

## Next Steps

1. Configure MCP server with your AI agent
2. Initialize a learning project
3. Generate curriculum from LRD
4. Start reviewing code with the MCP server
5. Track proficiency and progress
6. Complete modules and advance through curriculum

## Support

For issues or questions:
- GitHub: [code-tandem repository](https://github.com/yourusername/code-tandem)
- Documentation: See `MCP_SERVER_DESIGN.md` for architecture details
- Integration: See `AI_INTEGRATION_GUIDE.md` for AI and Task Master integration
