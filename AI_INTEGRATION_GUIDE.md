# CodeTandem AI & Task Management Integration Guide

## Overview

CodeTandem is designed as a **learning-focused system** that complements project management tools like Task Master. This guide explains how they integrate and work together.

## Architecture Philosophy

### CodeTandem (Learning Platform)
- **Purpose:** Teach programming skills through structured modules
- **Focus:** Educational progression, skill mastery, proficiency tracking
- **Output:** Developers with demonstrated competency
- **Progression:** AI-gated based on code quality and objective completion

### Task Master (Project Management)
- **Purpose:** Manage project tasks and development workflow
- **Focus:** Feature delivery, task completion, project progress
- **Output:** Working software projects
- **Progression:** Task-based with dependencies

### Working Together

```
┌─────────────────────┐         ┌─────────────────────┐
│   Task Master       │         │   CodeTandem        │
│                     │         │                     │
│ • Project tasks     │         │ • Learning modules  │
│ • Feature backlog   │◄───────►│ • Skill objectives  │
│ • Dependencies      │         │ • Proficiency       │
│ • Task status       │         │ • TODO tracking     │
└─────────────────────┘         └─────────────────────┘
        │                                 │
        │                                 │
        ▼                                 ▼
┌─────────────────────────────────────────────────┐
│            Developer's Project                   │
│                                                  │
│  Task Master Tasks → CodeTandem Learning         │
│  CodeTandem Skills → Task Master Execution       │
└─────────────────────────────────────────────────┘
```

## Integration Patterns

### Pattern 1: Learning Before Building

**Use Case:** Developer needs to learn new technology before implementing feature

**Workflow:**
```bash
# 1. Task Master - Identify task requiring new skills
$ task-master next
Task #12: Implement GraphQL API
  Prerequisites: Need to learn GraphQL

# 2. CodeTandem - Learn required skills
$ cd ~/learning/graphql-tutorial
$ codetandem init
$ # Edit lrd.md: "Learn GraphQL API development"
$ codetandem generate-curriculum
$ codetandem start
# ... complete learning modules ...

# 3. Return to Task Master with new skills
$ cd ~/project
$ task-master start 12
# Now equipped with GraphQL knowledge
```

### Pattern 2: Parallel Learning and Building

**Use Case:** Learn concepts while working on project tasks

**Workflow:**
```bash
# Terminal 1: Project work (Task Master)
$ cd ~/my-project
$ task-master start 15
# Working on feature...

# Terminal 2: Learning (CodeTandem)  
$ cd ~/learning/advanced-python
$ codetandem start
# Learning advanced concepts...

# Apply learning back to project
# Copy patterns from CodeTandem to Task Master project
```

### Pattern 3: TODO-Based Integration

**Use Case:** CodeTandem learning objectives become project TODOs

**CodeTandem Learning:**
```python
# ~/learning/auth-module/src/auth.py
# TODO: [obj-1] Implement JWT token generation
def generate_token(user_id):
    # Learning implementation
    pass
```

**Apply to Project:**
```python
# ~/my-project/src/auth.py
# TODO: #TM-45 Implement JWT authentication (learned from CodeTandem)
def generate_token(user_id):
    # Production implementation using learned patterns
    pass
```

### Pattern 4: Skill Prerequisites for Tasks

**Use Case:** Define learning requirements in Task Master tasks

**Task Master task.json:**
```json
{
  "id": "task-23",
  "title": "Build React dashboard",
  "prerequisites": {
    "skills": ["React hooks", "State management", "API integration"],
    "codetandem_modules": ["react-fundamentals", "react-hooks", "api-patterns"]
  }
}
```

**Developer workflow:**
```bash
# Check task requirements
$ task-master get task-23
Prerequisites: Complete CodeTandem modules:
  - react-fundamentals ✅
  - react-hooks ❌
  - api-patterns ❌

# Complete required learning
$ cd ~/learning/react-course
$ codetandem start  # Complete missing modules

# Return when ready
$ task-master start 23
```

## AI Provider Integration

### Current AI Integration

CodeTandem uses AI for:

1. **Curriculum Generation** (`generate-curriculum` command)
   - Reads LRD (Learning Requirements Document)
   - Generates personalized curriculum
   - Creates module structure

2. **Code Review** (`review` command)
   - Analyzes code quality
   - Provides feedback
   - Assigns proficiency scores
   - Detects code patterns

3. **Hint Generation** (`hint` command)
   - Context-aware hints
   - Progressive difficulty
   - Objective-specific guidance

4. **Solution Generation** (`solve` command)
   - Complete code solutions
   - Explanation of approach
   - Best practice demonstrations

### AI Provider Configuration

**Supported providers:**
```bash
# OpenAI
$ codetandem config set-provider openai
$ codetandem config set-key openai sk-...

# Anthropic (Claude)
$ codetandem config set-provider anthropic
$ codetandem config set-key anthropic sk-ant-...

# Google Gemini
$ codetandem config set-provider google
$ codetandem config set-key google AIza...
```

**Provider selection strategy:**
```typescript
// src/providers/factory.ts
export function getAIProvider(options: {
  providerName: 'openai' | 'anthropic' | 'google';
  model: string;
  apiKey: string;
}): AIProvider {
  // Returns appropriate provider
  // All providers implement same interface
}
```

### AI Integration Points

```
User Code
    │
    ▼
┌─────────────────┐
│  CodeTandem     │
│  Review Command │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Provider    │
│  (OpenAI/etc)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Code Analysis  │
│  • Quality      │
│  • Patterns     │
│  • Best Practice│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Proficiency    │
│  Score + Feedback│
└─────────────────┘
```

## Data Export/Import

### Current State Format

**CodeTandem state (`codetandem.state.json`):**
```json
{
  "version": "1.0",
  "currentModuleId": "module-2",
  "completedModules": ["module-1"],
  "skillScores": {
    "module-1": 7.5,
    "module-2": 0
  },
  "moduleProgress": {
    "module-1": {
      "attempts": 3,
      "objectivesCompleted": [
        {
          "objectiveId": "obj-1",
          "objectiveText": "Declare variables",
          "todoId": "obj-1",
          "completedAt": "2024-12-15T12:00:00Z",
          "score": 7.5,
          "hintsUsed": 1,
          "solutionsUsed": 0
        }
      ],
      "hintsUsed": 2,
      "solutionsUsed": 1,
      "bestScore": 8.0
    }
  }
}
```

### Integration with Task Master

**Proposed Integration Schema:**

```json
{
  "integration": {
    "taskmaster": {
      "enabled": true,
      "project_path": "~/my-project",
      "skill_mapping": {
        "react-fundamentals": ["task-23", "task-45"],
        "python-basics": ["task-12", "task-15"]
      },
      "sync_mode": "manual" // or "automatic"
    }
  }
}
```

**Potential sync commands:**
```bash
# Export CodeTandem skills to Task Master
$ codetandem export --format taskmaster --output skills.json

# Update Task Master prerequisites
$ task-master import skills.json --update-prerequisites

# Check which tasks are now unblocked
$ task-master list --available
```

### Export Formats

**1. JSON Export (Current)**
```bash
# Export state
$ codetandem status --json > progress.json

# Contains:
# - Completed modules
# - Skill scores  
# - Objective completion
# - Help usage metrics
```

**2. CSV Export (Proposed)**
```bash
$ codetandem export --format csv --output report.csv

# Columns:
# Module, Objectives Complete, Score, Hints Used, Solutions Used, Status
```

**3. Task Master Format (Proposed)**
```bash
$ codetandem export --format taskmaster

# Output:
{
  "skills_acquired": ["React Hooks", "API Integration"],
  "proficiency_levels": {
    "React Hooks": 8.5,
    "API Integration": 7.2
  },
  "ready_for_tasks": ["task-23", "task-45"]
}
```

## Suggested Integration Features

### Feature 1: Skill-Based Task Prerequisites

**Implementation:**
```bash
# Task Master side
$ task-master add task \
  --title "Build dashboard" \
  --requires-skill "react-hooks:7.0" \
  --requires-skill "api-integration:6.0"

# Check if developer ready
$ task-master can-start 23
❌ Missing skills:
  - react-hooks (need 7.0, have 0.0)
  - api-integration (need 6.0, have 0.0)

Recommended CodeTandem modules:
  - react-fundamentals
  - react-hooks-advanced
  - rest-api-patterns
```

### Feature 2: Automatic Skill Updates

**Workflow:**
```bash
# In CodeTandem project
$ codetandem review src/hooks.js
🎉 MODULE COMPLETED!
✓ React Hooks
✓ Final Score: 8.5/10.0

# Auto-notify Task Master (if configured)
Updating Task Master skill registry...
✓ Skill "React Hooks" → 8.5/10.0
✓ Tasks unblocked: 2 tasks now available
```

### Feature 3: Learning Recommendations

**Task Master integration:**
```bash
$ task-master next
Next task: #45 - Build GraphQL API

⚠️  Recommended learning:
This task requires skills you may not have:
  - GraphQL schema design
  - Resolver implementation

Start learning:
  $ cd ~/learning && codetandem init
  # Create LRD for GraphQL
  $ codetandem generate-curriculum
```

### Feature 4: Progress Dashboard

**Combined view:**
```bash
$ dev-dashboard

┌─────────────────────────────────────────┐
│  Developer Progress Dashboard            │
├─────────────────────────────────────────┤
│  Task Master                             │
│  • Tasks completed: 12/45                │
│  • Current sprint: 4 tasks               │
│  • Blocked tasks: 3                      │
│                                          │
│  CodeTandem                              │
│  • Modules completed: 5/10               │
│  • Current module: React Hooks           │
│  • Average proficiency: 7.8/10.0         │
│                                          │
│  Skills Unlocked                         │
│  ✅ React Fundamentals (8.0)             │
│  ✅ JavaScript ES6+ (7.5)                │
│  ✅ API Integration (7.8)                │
│  ⏳ GraphQL (in progress)                │
│                                          │
│  Recommendations                         │
│  • Complete GraphQL module               │
│  • Then start Task Master #23            │
└─────────────────────────────────────────┘
```

## API Integration Points

### Current APIs

CodeTandem exposes these via CLI:
```bash
codetandem status --json        # Get current state
codetandem list --json          # Get all modules
codetandem config get-provider  # Get AI provider
```

### Proposed REST API (Future)

```typescript
// GET /api/status
{
  "currentModule": "react-hooks",
  "completedModules": ["react-fundamentals", "js-es6"],
  "skillScores": {
    "react-fundamentals": 8.0,
    "js-es6": 7.5
  }
}

// GET /api/skills
{
  "skills": [
    {
      "name": "React Hooks",
      "proficiency": 8.0,
      "moduleId": "react-hooks",
      "completedAt": "2024-12-15T12:00:00Z"
    }
  ]
}

// POST /api/sync/taskmaster
{
  "projectPath": "~/my-project",
  "taskIds": ["task-23", "task-45"]
}
```

## File Format Compatibility

### CodeTandem Files

```
.codetandem/
├── lrd.md                    # Learning Requirements (like Task Master's PRD)
├── settings.json             # User preferences
└── docs/
    └── curriculum.md         # Generated curriculum

curriculum.md                 # Module definitions
modules.json                  # Structured module data
codetandem.state.json        # Progress tracking
```

### Task Master Files (Example)

```
.taskmaster/
├── prd.txt                   # Product Requirements
├── tasks.json                # Task definitions
├── config.json               # Project config
└── workflow/
    └── state.json            # Current workflow state
```

### Shared TODO Format

**Both systems can use:**
```javascript
// CodeTandem format
// TODO: [obj-1] Implement feature

// Task Master format  
// TODO: #TM-23 Implement feature

// Combined format (proposed)
// TODO: [obj-1] #TM-23 Implement feature
//       └─────┘ └────┘
//       CodeTandem  Task Master
//       learning    project task
```

## Real-World Integration Example

### Scenario: Full-Stack Developer Learning & Building

**Project:** Build e-commerce platform (Task Master managed)  
**Skills needed:** React, Node.js, PostgreSQL, Auth (CodeTandem modules)

**Week 1: Foundation Learning**
```bash
# Start with CodeTandem learning
$ mkdir ~/learning/fullstack-ecommerce
$ cd ~/learning/fullstack-ecommerce
$ codetandem init

# Edit lrd.md with learning goals
# Generate curriculum
$ codetandem generate-curriculum

# Learn fundamentals
$ codetandem start  # React basics
$ codetandem start  # Node.js basics
$ codetandem start  # PostgreSQL basics

# Track: 3 modules completed, avg score 7.8
```

**Week 2: Apply to Project**
```bash
# Switch to project
$ cd ~/projects/ecommerce-platform
$ task-master status
Tasks available (skills acquired):
  - #12: Set up React frontend ✅ (requires React 7.0+, have 8.2)
  - #15: Build Node API ✅ (requires Node.js 7.0+, have 7.5)
  - #18: Database schema ❌ (requires PostgreSQL 7.0+, have 6.5)

# Complete more learning
$ cd ~/learning/fullstack-ecommerce
$ codetandem start  # PostgreSQL advanced module

# Now all tasks available
$ cd ~/projects/ecommerce-platform
$ task-master start 18
```

**Week 3: Specialized Learning**
```bash
# Hit roadblock on authentication
$ task-master status
Task #23: Implement JWT auth
Status: Blocked - need authentication skills

# Learn authentication
$ cd ~/learning/auth-module
$ codetandem init
# Focus LRD on JWT and session management
$ codetandem generate-curriculum
$ codetandem start

# Apply learning
$ cd ~/projects/ecommerce-platform
$ task-master start 23  # Now have required skills
```

## Benefits of Integration

### For Individual Developers

✅ **Learn before building** - Acquire skills through CodeTandem first  
✅ **Structured learning** - Follow curriculum instead of random tutorials  
✅ **Proven competency** - Proficiency scores show actual skill level  
✅ **Smooth transition** - Apply learned patterns directly to projects  

### For Teams

✅ **Skill visibility** - See who has which skills at what proficiency  
✅ **Task assignment** - Assign tasks to developers with required skills  
✅ **Learning paths** - Recommend CodeTandem modules for upcoming tasks  
✅ **Quality assurance** - Developers have proven competency before implementation  

### For Education

✅ **Curriculum management** - CodeTandem for teaching, Task Master for projects  
✅ **Student progress** - Track both learning (CodeTandem) and building (Task Master)  
✅ **Assessment** - Proficiency scores for grading, task completion for projects  
✅ **Real-world preparation** - Students learn tools they'll use professionally  

## Summary

**CodeTandem's Role:**
- 🎓 Educational platform for skill acquisition
- 📊 Proficiency tracking and assessment
- 🤖 AI-powered personalized learning
- ✅ Mastery verification through objectives

**Integration with Task Management:**
- 📋 Skills from CodeTandem → Prerequisites in Task Master
- 🔄 Learning completion → Task unlocking
- 📈 Proficiency scores → Skill confidence levels
- 🎯 Task requirements → Learning recommendations

**Current State:**
- ✅ JSON export for state and progress
- ✅ CLI commands for status queries
- ✅ Standardized TODO format (can align with Task Master)
- ⏳ Direct Task Master integration (future feature)

**Next Steps for Full Integration:**
1. Implement export command with Task Master format
2. Add skill mapping configuration
3. Create sync utilities
4. Build combined dashboard
5. Add webhook notifications for module completion

---

**Last Updated:** December 15, 2024  
**Version:** 1.0.0  
**Status:** Documentation complete, integration features roadmapped
