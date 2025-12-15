# CodeTandem MCP with Zed - Quick Start

## ✅ Setup Complete!

The CodeTandem MCP server has been successfully configured in your Zed editor.

### Configuration Location
```
~/.config/zed/settings.json
```

### Added Configuration
```json
"codetandem": {
  "source": "custom",
  "enabled": true,
  "command": "node",
  "args": [
    "/Users/reubenwestrop/Documents/Github/code-tandem/dist/mcp/server.js"
  ]
}
```

## 🚀 Next Steps

### 1. Restart Zed
Completely quit and restart Zed to load the new MCP server:
- Press `Cmd+Q` to quit
- Reopen Zed

### 2. Initialize a Learning Project

In your terminal, navigate to a project directory and initialize CodeTandem:

```bash
cd ~/your-learning-project
codetandem init
```

This creates:
- `.codetandem/` directory
- `.codetandem/lrd.md` - Learning Requirements Document
- `.codetandem/settings.json` - Learning preferences

### 3. Create Your Learning Curriculum

Edit `.codetandem/lrd.md` with your learning goals:

```markdown
# React Counter App

I want to learn how to build a simple React counter application.

## What I want to learn:
- Setting up React component state with useState
- Handling button click events
- Updating state based on user interactions
- Displaying dynamic values in JSX

## What I want to build:
A counter component that can increment and decrement a number.
```

### 4. Generate Curriculum

```bash
codetandem generate
```

This converts your LRD into structured modules with objectives.

### 5. Open Project in Zed

```bash
cd ~/your-learning-project
zed .
```

## 💬 Using CodeTandem in Zed Assistant

Once Zed is restarted, open the Assistant panel and try these prompts:

### Check Available Tools
```
What CodeTandem tools are available?
```

Expected: List of 15 CodeTandem MCP tools

### Get Current Module
```
Use CodeTandem to show me my current learning module
```

### Review Code
```
Review my Counter.tsx file with CodeTandem
```

### Check Progress
```
What's my CodeTandem proficiency for the current module?
```

### Get Remaining Objectives
```
What CodeTandem objectives do I still need to complete?
```

### Request Hint (0.5 penalty)
```
I'm stuck on implementing useState. Can you get a CodeTandem hint?
```

### Get Solution (1.5 penalty)
```
I need help with the increment function. Get a CodeTandem solution (I understand the penalty).
```

## 🎯 Learning Workflow

### Step 1: Check Current Objectives
Ask Zed assistant:
```
Show me my current CodeTandem module and remaining objectives
```

### Step 2: Implement Code with TODO IDs
Add TODOs with objective IDs in your code:
```typescript
// TODO: [obj-1] Implement basic counter state
const [count, setCount] = useState(0);

// TODO: [obj-2] Add increment functionality
const increment = () => setCount(count + 1);

// TODO: [obj-3] Add decrement functionality
const decrement = () => setCount(count - 1);
```

### Step 3: Review Each Objective
After implementing each objective:
```
Review my Counter.tsx file with CodeTandem
```

The system will:
- Evaluate code quality (0-10)
- Apply penalties if you used hints/solutions
- Record objective completion
- Auto-complete module when ALL objectives done + score ≥ 7.0

### Step 4: Track Progress
```
Show my overall CodeTandem progress
```

## 📊 Proficiency System

### Scoring
- **Base score**: 0-10 (AI evaluates code quality)
- **Hint penalty**: -0.5 points each
- **Solution penalty**: -1.5 points each
- **Max penalty**: -3.0 points

### Progression Requirements
To complete a module, you need:
1. ✅ Complete **ALL objectives** (not just one)
2. ✅ Achieve **score ≥ 7.0** (after penalties)

### Example
```
Base Score: 9.0
Hints Used: 2 (penalty: -1.0)
Solutions Used: 0
Final Score: 8.0 ✓ PASS
```

## 🛠️ Troubleshooting

### Issue: "No CodeTandem tools available"

**Solution:** Restart Zed completely
```bash
# Quit Zed
# Then reopen
```

### Issue: "No current module in progress"

**Solution:** Initialize and generate curriculum
```bash
cd your-learning-project
codetandem init
# Edit .codetandem/lrd.md
codetandem generate
```

### Issue: MCP server not starting

**Solution:** Check server manually
```bash
node /Users/reubenwestrop/Documents/Github/code-tandem/dist/mcp/server.js
# Should output: "CodeTandem MCP Server running on stdio"
```

If it fails, rebuild:
```bash
cd /Users/reubenwestrop/Documents/Github/code-tandem
npm run build
```

### Issue: Reviews not recording progress

**Solution:** Ensure TODOs have correct ID format
```typescript
// ✅ CORRECT
// TODO: [obj-1] Description

// ❌ WRONG
// TODO: obj-1 Description
// TODO [obj1] Description
```

## 📚 Documentation

- **[MCP_USAGE_GUIDE.md](./MCP_USAGE_GUIDE.md)** - Complete MCP documentation
- **[PROFICIENCY_SYSTEM.md](./PROFICIENCY_SYSTEM.md)** - Proficiency tracking details
- **[ZED_MCP_SETUP.md](./ZED_MCP_SETUP.md)** - Detailed setup guide

## 🎉 You're Ready!

1. ✅ MCP server configured in Zed
2. ✅ Server tested and working
3. ✅ Backup created at `~/.config/zed/settings.backup.json`

**Next:** Restart Zed and start learning!
