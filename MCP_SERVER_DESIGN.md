# CodeTandem MCP Server Design

## Overview

An MCP (Model Context Protocol) server that enables AI coding assistants (like Claude Code, Cursor, etc.) to interact with CodeTandem's learning system. This allows AI agents to guide users through learning modules, submit code for review, track proficiency, and manage objectives.

## Why MCP Server?

### Problem
- **AI agents code most of the project** - Claude Code, Cursor, etc. write the majority of code
- **Manual CLI interaction breaks flow** - Context switching from AI chat to terminal
- **AI can't access learning context** - No visibility into current module, objectives, proficiency
- **No automated review submission** - AI writes code but can't submit it for review

### Solution: MCP Server

```
┌─────────────────────┐
│   Claude Code /     │
│   Cursor / AI Agent │
└──────────┬──────────┘
           │
           │ MCP Protocol
           ▼
┌─────────────────────┐
│  CodeTandem MCP     │
│  Server             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  CodeTandem CLI     │
│  (backend logic)    │
└─────────────────────┘
```

### Benefits

✅ **Seamless AI workflow** - AI can check objectives, submit reviews, get hints
✅ **Context awareness** - AI knows current module, proficiency, remaining objectives  
✅ **Automated learning** - AI guides user through curriculum without manual commands
✅ **Proficiency tracking** - AI tracks its own hint/solution usage
✅ **Natural integration** - Works in AI chat, no context switching

## MCP Server Architecture

### Server Structure

```typescript
// src/mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "codetandem-mcp",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},      // CodeTandem commands as MCP tools
    resources: {},  // Curriculum, state, modules as resources
  },
});
```

### MCP Tools (Commands AI Can Call)

#### 1. Learning Management Tools

```typescript
// Get current module and objectives
{
  name: "codetandem_get_current_module",
  description: "Get the current learning module and objectives",
  inputSchema: {
    type: "object",
    properties: {},
  }
}
// Returns:
{
  moduleId: "python-fundamentals",
  title: "Python Fundamentals - Variables",
  objectives: [
    { id: "obj-1", text: "Declare and use variables", completed: true },
    { id: "obj-2", text: "Work with data types", completed: false },
    { id: "obj-3", text: "String operations", completed: false }
  ],
  proficiency: 7.5,
  hintsUsed: 2,
  solutionsUsed: 0
}
```

```typescript
// Submit code for review
{
  name: "codetandem_review_code",
  description: "Submit code for AI review and proficiency scoring",
  inputSchema: {
    type: "object",
    properties: {
      filePath: { type: "string", description: "Path to file to review" },
      todoId: { type: "string", description: "Optional TODO ID (e.g., 'obj-1')" }
    },
    required: ["filePath"]
  }
}
// Returns:
{
  success: true,
  score: 8.5,
  adjustedScore: 7.5, // After penalties
  penalty: 1.0,
  feedback: "Great variable naming...",
  suggestions: ["Consider type hints", "Use f-strings"],
  objectiveCompleted: "obj-1",
  remainingObjectives: 2,
  moduleComplete: false
}
```

```typescript
// Get hint for objective
{
  name: "codetandem_get_hint",
  description: "Get AI hint for current objective (applies -0.5 penalty)",
  inputSchema: {
    type: "object",
    properties: {
      objectiveIndex: { type: "number", description: "Objective number (1-based)" }
    }
  }
}
// Returns:
{
  hint: "Think about variable naming conventions...",
  penaltyApplied: 0.5,
  totalHints: 3,
  totalPenalty: 1.5
}
```

```typescript
// Get AI solution
{
  name: "codetandem_get_solution",
  description: "Get AI-generated solution (applies -1.5 penalty, use sparingly)",
  inputSchema: {
    type: "object",
    properties: {
      objectiveIndex: { type: "number" },
      confirm: { type: "boolean", description: "Must be true to confirm penalty" }
    },
    required: ["objectiveIndex", "confirm"]
  }
}
```

```typescript
// List all modules
{
  name: "codetandem_list_modules",
  description: "List all curriculum modules with completion status",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

```typescript
// Get proficiency report
{
  name: "codetandem_get_proficiency",
  description: "Get detailed proficiency report for current module",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
// Returns:
{
  moduleId: "python-fundamentals",
  objectivesComplete: 1,
  objectivesTotal: 3,
  rawScore: 8.5,
  hintsUsed: 2,
  solutionsUsed: 1,
  penalty: 2.5,
  finalScore: 6.0,
  canProgress: false,
  missingObjectives: ["obj-2", "obj-3"]
}
```

#### 2. Curriculum Management Tools

```typescript
// Initialize project
{
  name: "codetandem_init",
  description: "Initialize CodeTandem in current project",
  inputSchema: {
    type: "object",
    properties: {
      projectPath: { type: "string" }
    }
  }
}
```

```typescript
// Generate curriculum from LRD
{
  name: "codetandem_generate_curriculum",
  description: "Generate personalized curriculum from LRD file",
  inputSchema: {
    type: "object",
    properties: {
      lrdPath: { type: "string", default: "./lrd.md" }
    }
  }
}
```

```typescript
// Update learning preferences
{
  name: "codetandem_update_settings",
  description: "Update learning preferences (coding bias, difficulty)",
  inputSchema: {
    type: "object",
    properties: {
      codingBias: { type: "string", enum: ["guided", "balanced", "independent"] },
      difficulty: { type: "string", enum: ["gentle", "progressive", "challenging"] }
    }
  }
}
```

### MCP Resources (Read-Only Data)

```typescript
// Current state
{
  uri: "codetandem://state",
  name: "CodeTandem State",
  description: "Current learning state and progress",
  mimeType: "application/json"
}

// Curriculum
{
  uri: "codetandem://curriculum",
  name: "Learning Curriculum",
  description: "Full curriculum with all modules",
  mimeType: "text/markdown"
}

// Module list
{
  uri: "codetandem://modules",
  name: "Structured Modules",
  description: "Parsed module structure",
  mimeType: "application/json"
}

// Current module details
{
  uri: "codetandem://current-module",
  name: "Current Module",
  description: "Detailed info about current learning module",
  mimeType: "application/json"
}

// Proficiency report
{
  uri: "codetandem://proficiency",
  name: "Proficiency Report",
  description: "Detailed proficiency metrics",
  mimeType: "application/json"
}
```

## AI Agent Workflow Examples

### Example 1: AI Guides User Through Module

**User:** "Help me learn Python variables"

**Claude Code (using MCP):**
```typescript
// 1. Check current module
const module = await use_mcp_tool("codetandem_get_current_module", {});

// Response:
{
  title: "Python Fundamentals - Variables",
  objectives: [
    { id: "obj-1", text: "Declare and use variables", completed: false },
    { id: "obj-2", text: "Work with data types", completed: false },
    { id: "obj-3", text: "String operations", completed: false }
  ]
}
```

**Claude Code response:**
"Great! Let's work on Python variables. Your current module has 3 objectives:

1. ✍️ Declare and use variables
2. ✍️ Work with data types  
3. ✍️ String operations

Let's start with objective 1. I'll help you create a file with TODO markers..."

**Claude Code creates file:**
```python
# src/basics.py

# TODO: [obj-1] Declare and use variables
# Create variables for a person's name, age, and student status

# TODO: [obj-2] Work with data types
# Practice converting between strings and numbers

# TODO: [obj-3] String operations
# Create greeting messages using string formatting
```

**Claude Code:** "I've created the file structure. Try implementing objective 1 yourself. When you're ready, I can review your code or provide a hint if you're stuck."

**User:** "I'm stuck, can I get a hint?"

**Claude Code (using MCP):**
```typescript
const hint = await use_mcp_tool("codetandem_get_hint", {
  objectiveIndex: 1
});

// Response:
{
  hint: "In Python, you don't need to declare variable types...",
  penaltyApplied: 0.5,
  totalHints: 1
}
```

**Claude Code:** "💡 Hint: In Python, you don't need to declare variable types...

⚠️ Note: This hint applies a -0.5 penalty to your proficiency score. Current penalty: -0.5 points."

### Example 2: AI Submits Code for Review

**User:** "Review my code"

**Claude Code (using MCP):**
```typescript
const review = await use_mcp_tool("codetandem_review_code", {
  filePath: "src/basics.py",
  todoId: "obj-1"
});

// Response:
{
  success: true,
  score: 8.5,
  adjustedScore: 8.0,
  penalty: 0.5,
  feedback: "Excellent variable declarations! Clean naming...",
  suggestions: ["Consider adding type hints"],
  objectiveCompleted: "obj-1",
  remainingObjectives: 2,
  moduleComplete: false
}
```

**Claude Code:**
"✅ **Code Review Complete!**

**Score:** 8.5/10.0 (8.0 after penalties)
**Penalty:** -0.5 (from 1 hint used)

**Feedback:** Excellent variable declarations! Clean naming conventions.

**Suggestions:**
- Consider adding type hints for better code documentation

**Progress:**
✅ Objective 1 complete! (obj-1: Declare and use variables)
📋 Remaining: 2 objectives

Ready to work on objective 2: 'Work with data types'?"

### Example 3: Module Completion Flow

**Claude Code (checks proficiency):**
```typescript
const proficiency = await use_mcp_tool("codetandem_get_proficiency", {});

// Response:
{
  objectivesComplete: 3,
  objectivesTotal: 3,
  finalScore: 7.8,
  canProgress: true,
  moduleComplete: true
}
```

**Claude Code:** "🎉 Congratulations! You've completed all objectives for this module!

**Final Proficiency Score:** 7.8/10.0

You're ready to move to the next module. Let me check what's next..."

```typescript
const nextModule = await use_mcp_tool("codetandem_list_modules", {});
// AI automatically sees next module and presents it
```

### Example 4: AI Self-Tracks Help Usage

**Claude Code internal logic:**
```typescript
// Before providing solution
async function provideSolution(objectiveIndex: number) {
  // Warn user about penalty
  await sendMessage(`⚠️ WARNING: Requesting a solution applies a -1.5 penalty.
  
  This should only be used when completely stuck. Alternatives:
  - Request a hint (-0.5 penalty)
  - Review module documentation
  - Ask me to explain the concept
  
  Continue with solution? (yes/no)`);
  
  const userConfirms = await getUserResponse();
  
  if (userConfirms) {
    const solution = await use_mcp_tool("codetandem_get_solution", {
      objectiveIndex: objectiveIndex,
      confirm: true
    });
    
    // Track internally
    this.solutionsUsed++;
    
    return solution;
  }
}
```

## Implementation Plan

### Phase 1: Core MCP Server

**File structure:**
```
src/mcp/
├── server.ts              # Main MCP server
├── tools/
│   ├── learning.ts        # Learning management tools
│   ├── curriculum.ts      # Curriculum tools
│   └── proficiency.ts     # Proficiency tracking tools
├── resources/
│   ├── state.ts           # State resource
│   ├── curriculum.ts      # Curriculum resource
│   └── modules.ts         # Modules resource
└── types.ts               # MCP type definitions
```

**package.json addition:**
```json
{
  "scripts": {
    "mcp": "node dist/mcp/server.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0"
  }
}
```

### Phase 2: Tool Implementations

**Example: Review tool:**
```typescript
// src/mcp/tools/learning.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function reviewCodeTool(args: {
  filePath: string;
  todoId?: string;
}) {
  // Execute CodeTandem CLI command
  const cmd = `codetandem review "${args.filePath}" --json`;
  const { stdout } = await execAsync(cmd);
  
  const result = JSON.parse(stdout);
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
}
```

### Phase 3: Resource Implementations

**Example: State resource:**
```typescript
// src/mcp/resources/state.ts
import { readFile } from 'fs/promises';

export async function getStateResource() {
  const state = await readFile('./codetandem.state.json', 'utf-8');
  
  return {
    contents: [{
      uri: "codetandem://state",
      mimeType: "application/json",
      text: state
    }]
  };
}
```

### Phase 4: Configuration

**MCP server config:**
```json
// .codetandem/mcp-config.json
{
  "mcpServers": {
    "codetandem": {
      "command": "node",
      "args": ["dist/mcp/server.js"],
      "env": {
        "CODETANDEM_PROJECT_ROOT": "."
      }
    }
  }
}
```

**Claude Desktop config:**
```json
// ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "codetandem": {
      "command": "npx",
      "args": ["-y", "codetandem-mcp"]
    }
  }
}
```

## AI Agent Capabilities

### What AI Can Do With MCP

✅ **Read current learning context**
```typescript
const module = await use_mcp_tool("codetandem_get_current_module");
// AI knows: current module, objectives, progress, proficiency
```

✅ **Submit code for review automatically**
```typescript
// After AI writes code
const review = await use_mcp_tool("codetandem_review_code", {
  filePath: "src/solution.py"
});
// AI gets immediate feedback on code quality
```

✅ **Track its own help usage**
```typescript
// When AI provides hint
const hint = await use_mcp_tool("codetandem_get_hint", {
  objectiveIndex: 2
});
// AI knows: "I just gave a hint, -0.5 penalty applied"
```

✅ **Guide user through complete learning path**
```typescript
// AI can orchestrate entire learning journey
1. Get current module
2. Present objectives
3. Help user code
4. Submit for review
5. Handle feedback
6. Move to next objective
7. Complete module
8. Progress to next module
```

✅ **Provide context-aware assistance**
```typescript
const proficiency = await use_mcp_tool("codetandem_get_proficiency");

if (proficiency.hintsUsed > 5) {
  // AI: "You've used many hints. Let's review concepts before continuing."
}

if (proficiency.finalScore < 7.0) {
  // AI: "Your score is below passing. Let's focus on code quality."
}
```

## Integration with Claude Code

### Example Session

```
User: I want to learn Python

Claude Code:
Let me set up a learning environment for you.

[Uses MCP: codetandem_init]

Great! I've initialized CodeTandem. Let me create a learning plan.

What specifically would you like to learn about Python?

User: Variables, functions, and loops

Claude Code:
[Creates lrd.md with user's goals]
[Uses MCP: codetandem_generate_curriculum]

Perfect! I've generated a curriculum with 5 modules:
1. Python Basics - Variables ⬅️ Current
2. Python Basics - Functions
3. Control Flow - Conditionals
4. Control Flow - Loops
5. Practice Project

Let's start with Module 1: Variables. You have 3 objectives:
✍️ obj-1: Declare and use variables
✍️ obj-2: Work with data types
✍️ obj-3: String operations

I'll create a practice file for you...

[Creates src/basics.py with TODO markers]

Try implementing obj-1 yourself. I'm here if you need help!

User: [writes some code]

User: Can you review this?

Claude Code:
[Uses MCP: codetandem_review_code]

✅ Great start! Score: 7.5/10.0

Feedback: Your variable declarations are clear...

Suggestions:
- Add type hints
- Use more descriptive names

✅ Objective 1 complete!
📋 Remaining: 2 objectives

Ready for objective 2?
```

### Advantages Over Manual CLI

| Manual CLI | MCP Server |
|------------|-----------|
| User types `codetandem review src/file.py` | AI: `review_code({ filePath: "src/file.py" })` |
| User switches context to terminal | AI handles in chat |
| User copies feedback back to editor | AI sees feedback, adjusts guidance |
| User tracks objectives manually | AI tracks automatically |
| User decides when to progress | AI knows when ready to progress |

## Security Considerations

### Safeguards

1. **Confirmation for penalties**
```typescript
// Solution requires explicit confirmation
codetandem_get_solution({
  objectiveIndex: 1,
  confirm: true  // Must be explicitly set
})
```

2. **Read-only resources**
```typescript
// State is read-only through resources
// Only tools can modify state
```

3. **File path validation**
```typescript
// Validate file paths are within project
function validatePath(filePath: string) {
  const resolved = path.resolve(filePath);
  const projectRoot = process.cwd();
  if (!resolved.startsWith(projectRoot)) {
    throw new Error("Path outside project");
  }
}
```

4. **Rate limiting (optional)**
```typescript
// Prevent spam of hint requests
const hintCooldown = 60000; // 1 minute
```

## Benefits Summary

### For Users
✅ **Natural learning flow** - No context switching  
✅ **AI-guided education** - Claude Code walks you through modules  
✅ **Immediate feedback** - Reviews happen in chat  
✅ **Transparent tracking** - AI shows proficiency and penalties  

### For AI Agents
✅ **Learning context** - Knows current module, objectives, proficiency  
✅ **Progress awareness** - Can guide user through complete curriculum  
✅ **Self-monitoring** - Tracks its own hint/solution usage  
✅ **Automated workflows** - Can orchestrate entire learning journey  

### For Integration
✅ **Standard protocol** - MCP works with any MCP-compatible AI  
✅ **Tool-based** - Clean API for all CodeTandem features  
✅ **Resource access** - AI can read state/curriculum/modules  
✅ **Extensible** - Easy to add new tools and resources  

## Next Steps

1. ✅ Design MCP server architecture
2. ⏳ Implement core MCP server
3. ⏳ Implement learning management tools
4. ⏳ Implement curriculum tools  
5. ⏳ Implement resources
6. ⏳ Test with Claude Desktop
7. ⏳ Create MCP usage documentation
8. ⏳ Publish MCP server package

---

**Status:** Design complete, ready for implementation  
**Target:** MCP SDK 0.5.0+  
**Compatible with:** Claude Desktop, Cursor, any MCP client
