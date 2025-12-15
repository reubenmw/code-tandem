# CodeTandem - New User Flow

## Overview

CodeTandem now follows a streamlined, AI-driven learning workflow similar to Task Master's PRD-based approach.

## ✅ Implemented User Flow

### 1. User Initializes Project

```bash
codetandem init
```

**What it creates:**
- `.codetandem/` directory
- `lrd.md` - Learning Requirements Document template
- `.codetandem/settings.json` - Default learning preferences

**Output:**
```
✅ Initialization complete!

Step 1: Define your learning goal
Step 2: Configure AI provider  
Step 3: Generate your custom curriculum
Step 4 (Optional): Adjust learning preferences
Step 5: Start learning!
```

---

### 2. User Inputs Learning Goal (LRD)

User edits `lrd.md` with:
- Their background and skill level
- What they want to learn
- Learning preferences
- Project requirements (optional)

**Example lrd.md:**
```markdown
# Learning Goal

Build a web scraper in Python

## My Background

- Beginner to Python
- Know JavaScript basics
- Learn best by building projects

## What I Want to Learn

- Python fundamentals
- HTTP requests and HTML parsing
- Data storage (CSV, JSON)
- Error handling

## Learning Preferences

- Prefer hands-on coding over theory
- Need detailed guidance initially
- Want to build real project

## Project Requirements

- Scrape e-commerce product data
- Extract name, price, rating
- Save to CSV file
```

---

### 3. User Generates Curriculum

```bash
# Configure AI provider (one-time setup)
codetandem config set-provider openai
codetandem config set-key openai YOUR_API_KEY

# Generate curriculum from LRD
codetandem generate-curriculum
```

**What it does:**
- Reads `lrd.md`
- Uses AI to create structured `curriculum.md` tailored to user's background
- Generates `modules.json` with learning modules
- Creates `codetandem.state.json` for progress tracking

**Output:**
```
✅ Curriculum generated successfully!

Curriculum preview:
──────────────────────────────────────────────────
# Python Fundamentals
## Variables and Data Types
- Declare variables
- Work with strings, numbers, booleans
...
──────────────────────────────────────────────────

Next steps:
  1. Review curriculum.md and edit if needed
  2. Run: codetandem start (to begin learning)
```

---

### 4. User Can Alter Settings

```bash
# View current settings
codetandem settings

# Adjust coding bias
codetandem settings --coding-bias guided    # More help
codetandem settings --coding-bias balanced  # Default
codetandem settings --coding-bias independent # Less help

# Adjust difficulty
codetandem settings --difficulty gentle      # Easier tasks
codetandem settings --difficulty progressive # Default
codetandem settings --difficulty challenging # Harder tasks

# Toggle features
codetandem settings --auto-review true
codetandem settings --auto-progress true
codetandem settings --detailed-feedback true

# Reset to defaults
codetandem settings --reset
```

**Settings explanation:**

| Setting | Options | Description |
|---------|---------|-------------|
| **Coding Bias** | guided, balanced, independent | Amount of AI guidance vs self-discovery |
| **Task Difficulty** | gentle, progressive, challenging | Learning curve steepness |
| **Auto Review** | true/false | Automatically review code after completion |
| **Auto Progress** | true/false | Automatically track progress from attempts |
| **Detailed Feedback** | true/false | Provide detailed explanations |

---

### 5. AI Reads Curriculum and Builds with User

```bash
# Start AI-assisted coding session
codetandem start

# Or focus on specific file
codetandem start src/scraper.py
```

**What it does:**
- Shows current module objectives
- Finds TODO comments in your code
- Provides context-aware coding guidance
- Adapts help based on your coding bias setting
- Adjusts difficulty based on your preferences

**Example session:**
```
🎯 Current Module: Python Fundamentals - Variables
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Objectives:
   1. Declare and use variables
   2. Work with different data types
   3. Practice string operations

📁 File: src/basics.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 3 TODOs in this file:

1. Line 5: TODO: Create a variable called 'name'
   💡 Hint: In Python, you don't need to declare types...

Ready to code!
```

---

### 6. AI Automatically Records Progress

```bash
# Review your code and get AI approval
codetandem review src/scraper.py

# Or review specific TODO
codetandem review src/scraper.py --todo "Create variable"
```

**What it does:**
- Analyzes your code quality
- Provides constructive feedback
- Updates skill score (0-10 scale)
- **Grants or denies AI approval for module completion**
- Tracks progress automatically

**Example review with auto-progression:**
```
🔍 Code Review Session

File: src/scraper.py
Module: Python Fundamentals - Variables
Current Skill: 5.2/10.0

🤖 Analyzing your code...

──────────────────────────────────────────────────────────
✅ Great work! Your code looks good.

Feedback:
Your variable declarations are clear and follow Python conventions.
Good use of descriptive names. The string operations are correct.

💡 Suggestions:
   1. Consider adding type hints for better code clarity
   2. You could use f-strings instead of .format()

Score: 7.5/10.0
   ↑ +2.3 improvement!
──────────────────────────────────────────────────────────

📊 Updating progress...

✓ Skill score updated: 5.2 → 7.5

🎉 MODULE COMPLETED!
✓ Python Fundamentals - Variables
✓ Final Score: 7.5/10.0

📚 Moving to next module...

Now Learning: Python Fundamentals - Data Types
Objectives:
   1. Work with strings, numbers, booleans
   2. Convert between data types
   3. Use type checking

Progress: 1/10 modules

  Run: codetandem start (to begin)
```

#### AI-Gated Proficiency System

**Critical Rule:** Progression is **fully automatic** based on demonstrated proficiency across ALL objectives.

**Requirements for progression:**
1. **Complete ALL module objectives** (not just one)
2. **Achieve score ≥ 7.0/10.0** (after penalties)
3. **Use TODO IDs** to track objective completion

**How it works:**

1. **User works on objectives** → Creates TODOs like `// TODO: [obj-1] Description`
2. **User requests review** → `codetandem review <file>`
3. **AI analyzes code** → Provides score (0-10) and feedback
4. **Proficiency calculation:**
   - Raw AI Score: 0-10 points
   - Penalty for hints: -0.5 points each
   - Penalty for solutions: -1.5 points each
   - Final Score = Raw Score - Penalties
5. **Progression decision:**
   - ✅ **ALL OBJECTIVES COMPLETE + Score ≥ 7.0**:
     - Automatically completes current module
     - Automatically advances to next module
     - Updates progress tracking
     - Displays next module objectives
   - ⚠️ **GOOD SCORE but INCOMPLETE OBJECTIVES**:
     - Shows which objectives remain
     - User must complete remaining objectives
   - ❌ **LOW SCORE or FAILED REVIEW**:
     - Stays on current module
     - Provides feedback for improvement
     - User must improve code and re-submit

**No manual steps required** - progression happens automatically when ALL objectives are mastered!

**Protection mechanisms:**

```bash
# Code doesn't meet standards - stays on current module
$ codetandem review src/basics.py

🔍 Code Review Session
...
⚠️  Your code needs some improvements.

Score: 5.8/10.0

⚠️  Not quite there yet
✓ Good progress, but AI approval required to proceed
  Need: Successful review + score ≥ 7.0 (current: 5.8)

📝 Next Steps:

1. Review the feedback and suggestions above
2. Make improvements to your code
3. Run: codetandem review src/basics.py (to check again)
```

```bash
# Code meets standards - automatically advances
$ codetandem review src/basics.py

🔍 Code Review Session
...
✅ Great work! Your code looks good.

Score: 7.5/10.0
   ↑ +1.7 improvement!

📊 Updating progress...

✓ Skill score updated: 5.8 → 7.5

🎉 MODULE COMPLETED!
✓ Python Fundamentals - Variables
✓ Final Score: 7.5/10.0

📚 Moving to next module...

Now Learning: Python Fundamentals - Data Types
Objectives:
   1. Work with strings, numbers, booleans
   2. Convert between data types
```

---

## Command Summary

| Command | Purpose | Status |
|---------|---------|--------|
| `codetandem init` | Initialize project with LRD template | ✅ Implemented |
| `codetandem config` | Configure AI provider | ✅ Implemented |
| `codetandem generate-curriculum` | Generate curriculum from LRD | ✅ Implemented |
| `codetandem settings` | View/modify learning preferences | ✅ Implemented |
| `codetandem status` | View progress | ✅ Implemented |
| `codetandem list` | List all modules | ✅ Implemented |
| `codetandem start` | Begin coding with AI assistance | ✅ Implemented |
| `codetandem review` | Get code review with automatic progression | ✅ Implemented |
| `codetandem hint` | Get hints for current task | ⚠️ Placeholder |

---

## File Structure

After initialization and curriculum generation:

```
my-learning-project/
├── lrd.md                      # Your learning requirements
├── curriculum.md               # AI-generated curriculum
├── modules.json                # Parsed module structure
├── codetandem.state.json       # Progress tracking
├── .codetandem/
│   └── settings.json           # Learning preferences
└── src/                        # Your code (created as you learn)
```

---

## Comparison to Task Master

| Task Master | CodeTandem |
|-------------|------------|
| PRD (Product Requirements) | LRD (Learning Requirements) |
| `parse-prd` | `generate-curriculum` |
| Task backlog | Learning modules |
| Task completion | Module completion |
| Project management | Learning management |

---

## Implementation Status

### ✅ Completed Features

1. **`init` command** - Project initialization with LRD template
2. **`config` command** - AI provider configuration
3. **`generate-curriculum` command** - AI-powered curriculum generation
4. **`settings` command** - Learning preferences management
5. **`status` command** - Progress tracking and reporting
6. **`list` command** - Module listing and navigation
7. **`start` command** - AI-assisted coding sessions with:
   - Current module/objective context
   - TODO-based guidance
   - Skill-based scaffolding
   - Settings-aware assistance
8. **`review` command** - AI code review with **automatic progression**:
   - Quality analysis and scoring (0-10 scale)
   - Automatic skill tracking
   - **AI-gated approval system** (score ≥ 7.0 required)
   - **Automatic module completion** when approved
   - **Automatic advancement** to next module
   - Constructive feedback and improvement suggestions

### ⚠️ Remaining Features

1. **`hint` command** - Context-aware hints for current objectives
2. **Dynamic difficulty adjustment** - Automatically adjust based on performance
3. **Enhanced scaffolding** - More sophisticated code generation based on bias settings

---

## Testing the Complete Flow

Try the full workflow:

```bash
# 1. Initialize project
cd /tmp/my-learning-project
codetandem init

# 2. Edit lrd.md with your learning goal
# (Open in your editor and describe what you want to learn)

# 3. Configure AI provider
codetandem config set-provider openai
codetandem config set-key openai sk-YOUR-KEY

# 4. Generate personalized curriculum
codetandem generate-curriculum

# 5. Adjust learning preferences (optional)
codetandem settings --coding-bias guided
codetandem settings --difficulty progressive

# 6. Check your progress
codetandem status
codetandem list

# 7. Start learning
codetandem start

# 8. Work on code (create files, write solutions)
# (Follow the objectives shown in step 7)

# 9. Submit for AI review and auto-progression
codetandem review src/your-file.py
# If score ≥ 7.0: Module auto-completes and advances to next!
# If score < 7.0: Get feedback and try again

# 10. Repeat steps 7-9 until all modules complete!
```

---

## Benefits of Automatic Progression Flow

✅ **User-friendly** - Clear step-by-step process  
✅ **AI-powered** - Curriculum tailored to user's background  
✅ **Fully automated** - No manual module completion needed  
✅ **Seamless progression** - Automatically advances when ready  
✅ **Quality-gated** - Cannot skip without demonstrating competency (≥ 7.0/10)  
✅ **Customizable** - Settings control learning experience  
✅ **Instant feedback** - Know immediately if you can progress  
✅ **Familiar** - Similar to Task Master workflow  
✅ **Flexible** - Can still manually edit curriculum.md  

---

Last updated: December 15, 2024
