# CodeTandem Proficiency System

## Overview

CodeTandem implements a comprehensive proficiency tracking system that ensures genuine learning by requiring users to complete multiple objectives per module and penalizing excessive reliance on hints and AI solutions.

## Core Requirements

### 1. Multiple Objective Completion

**Rule:** Users must complete ALL objectives in a module before progressing.

**Why:** Completing a single objective doesn't demonstrate mastery of the module's concepts. Each objective represents a critical skill or concept that must be mastered.

**Example:**
```
Module: Python Fundamentals - Variables
Objectives:
  1. Declare and use variables
  2. Work with different data types
  3. Practice string operations

Status: Must complete ALL 3 objectives to progress
```

### 2. Proficiency Scoring

**Formula:** `Final Score = Raw AI Score - Penalty`

**Penalties:**
- **Hints used:** -0.5 points per hint (max 3 points total penalty)
- **AI solutions used:** -1.5 points per solution (max 3 points total penalty)

**Passing threshold:** 7.0/10.0 (after penalties applied)

**Example:**
```
Raw AI Score: 8.5/10.0
Hints used: 2 (-1.0 points)
Solutions used: 1 (-1.5 points)
───────────────────────
Final Score: 6.0/10.0 ❌ FAIL (need 7.0+)

User needs to improve code quality to compensate for help used.
```

### 3. TODO ID Tracking

**Format:** `// TODO: [obj-1] Description`

**Purpose:** 
- Links code completion to specific objectives
- Prevents duplicate objective completion
- Enables granular progress tracking

**Examples:**
```javascript
// TODO: [obj-1] Declare variables for user name and age
let name = "Alice";
let age = 25;

// TODO: [obj-2] Convert between string and number types
let ageString = String(age);
let ageNumber = Number(ageString);

// TODO: [obj-3] Practice string concatenation and templates
let greeting = `Hello, ${name}! You are ${age} years old.`;
```

## User Journey

### Step 1: Review Module Objectives

```bash
$ codetandem start

🎯 Current Module: Python Fundamentals - Variables

📋 Objectives:
   1. Declare and use variables
   2. Work with different data types  
   3. Practice string operations

📁 Create TODO markers in your code:
   // TODO: [obj-1] Declare and use variables
   // TODO: [obj-2] Work with different data types
   // TODO: [obj-3] Practice string operations
```

### Step 2: Work on First Objective

User creates file with TODO:
```python
# src/basics.py
# TODO: [obj-1] Declare and use variables
name = "Alice"
age = 25
is_student = True
```

### Step 3: Get Help If Needed

**Option A: Request a hint (small penalty)**
```bash
$ codetandem hint --objective 1

💡 Hint System

Module: Python Fundamentals - Variables
⚠️  Hints used: 1 (each hint reduces final score by 0.5)

Objective: Declare and use variables

💭 Hint:
────────────────────────────────────────
Think about the key concepts in "Declare and use variables". 
What's the first step?
────────────────────────────────────────

💡 Remember: Using hints affects your proficiency score!
```

**Option B: Request AI solution (large penalty)**
```bash
$ codetandem solve --objective 1

⚠️  WARNING: Using AI solutions significantly reduces your score!

Each AI solution reduces your final score by 1.5 points.
This should only be used when you are completely stuck.

If you understand the risk, run:
  codetandem solve --objective 1 --confirm

💡 Better alternatives:
  1. Use: codetandem hint (smaller penalty)
  2. Review module documentation
  3. Break the problem into smaller parts
```

### Step 4: Submit for Review

```bash
$ codetandem review src/basics.py

🔍 Code Review Session

File: src/basics.py
Module: Python Fundamentals - Variables
Current Skill: 0.0/10.0

🤖 Analyzing your code...
──────────────────────────────────────────────────────────
✅ Great work! Your code looks good.

Feedback:
Your variable declarations are clear and properly typed.

Score: 8.0/10.0
──────────────────────────────────────────────────────────

📊 Updating progress...

⚠️  Proficiency penalty applied: -0.5 points
   Hints used: 1 (-0.5)
   Solutions used: 0 (-0.0)

✓ Skill score: 0.0 → 7.5 (raw: 8.0)

⚠️  Good progress, but more objectives needed
✓ Score meets requirement: 7.5/10.0
⚠️  Objectives: 1/3 complete
   Need to complete 2 more objectives

📋 Remaining objectives:
   2. Work with different data types
   3. Practice string operations
```

### Step 5: Complete Remaining Objectives

User continues with objectives 2 and 3, submitting each for review.

### Step 6: Module Completion

After completing ALL objectives with sufficient score:

```bash
$ codetandem review src/basics.py

🔍 Code Review Session
...
✅ Great work! Your code looks good.

Score: 7.8/10.0

📊 Updating progress...

✓ Skill score: 7.5 → 7.8

🎉 MODULE COMPLETED!
✓ Python Fundamentals - Variables
✓ Final Score: 7.8/10.0

📚 Moving to next module...

Now Learning: Python Fundamentals - Data Types
Objectives:
   1. Work with strings, numbers, booleans
   2. Convert between data types
   3. Use type checking

Progress: 1/10 modules
```

## Proficiency Penalties Explained

### Why Penalties?

**Educational Philosophy:**
- **Struggling builds understanding** - Wrestling with problems deepens learning
- **Instant answers harm retention** - Solutions without effort are quickly forgotten
- **Independence is the goal** - Real-world coding requires self-sufficiency

**Penalty Structure:**
```
Hint:     -0.5 points (gentle nudge, minimal penalty)
Solution: -1.5 points (significant help, major penalty)
```

### Penalty Examples

#### Example 1: No Help Used

```
Raw Score: 7.5/10.0
Hints: 0 (-0.0)
Solutions: 0 (-0.0)
───────────────────
Final: 7.5/10.0 ✅ PASS

Perfect! Full proficiency demonstrated.
```

#### Example 2: Few Hints Used

```
Raw Score: 8.0/10.0
Hints: 2 (-1.0)
Solutions: 0 (-0.0)
───────────────────
Final: 7.0/10.0 ✅ PASS (barely)

Acceptable, but try to use fewer hints next time.
```

#### Example 3: Heavy Assistance

```
Raw Score: 8.0/10.0
Hints: 3 (-1.5)
Solutions: 1 (-1.5)
───────────────────
Final: 5.0/10.0 ❌ FAIL

Too much help used. Need higher code quality
or less reliance on assistance.
```

#### Example 4: Excellent Code, Some Help

```
Raw Score: 9.5/10.0
Hints: 1 (-0.5)
Solutions: 1 (-1.5)
───────────────────
Final: 7.5/10.0 ✅ PASS

High quality code compensates for assistance used.
```

## State Tracking

### State Structure

```json
{
  "currentModuleId": "module-1",
  "completedModules": [],
  "skillScores": {
    "module-1": 7.5
  },
  "moduleProgress": {
    "module-1": {
      "attempts": 3,
      "objectivesCompleted": [
        {
          "objectiveId": "obj-1",
          "objectiveText": "Declare and use variables",
          "todoId": "obj-1",
          "completedAt": "2024-12-15T10:30:00Z",
          "score": 7.5,
          "hintsUsed": 1,
          "solutionsUsed": 0
        },
        {
          "objectiveId": "obj-2",
          "objectiveText": "Work with different data types",
          "todoId": "obj-2",
          "completedAt": "2024-12-15T11:15:00Z",
          "score": 8.0,
          "hintsUsed": 0,
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

### Objective Tracking

**Objective Completion Record:**
- `objectiveId`: Unique ID (e.g., "obj-1", "obj-2")
- `objectiveText`: Description of the objective
- `todoId`: ID from TODO comment (links code to objective)
- `completedAt`: Timestamp of completion
- `score`: Final score achieved (with penalties)
- `hintsUsed`: Number of hints at time of completion
- `solutionsUsed`: Number of solutions at time of completion

**Duplicate Prevention:**
- System checks if `objectiveId` or `todoId` already completed
- Prevents users from re-submitting same objective for credit

## Commands

### `codetandem hint`

**Purpose:** Get AI-generated hint for current objective

**Usage:**
```bash
codetandem hint                    # Hint for current file
codetandem hint --objective 2      # Hint for specific objective
```

**Penalty:** -0.5 points per hint used

**Output:**
```
💡 Hint System

Module: Python Fundamentals
⚠️  Hints used: 1 (each hint reduces final score by 0.5)

Objective: Declare and use variables

💭 Hint:
Think about the key concepts in "Declare and use variables".
What's the first step?

💡 Remember: Using hints affects your proficiency score!
```

### `codetandem solve`

**Purpose:** Get AI-generated complete solution

**Usage:**
```bash
codetandem solve --confirm           # Generate solution (requires confirmation)
codetandem solve --objective 2 --confirm
```

**Penalty:** -1.5 points per solution used

**Safety:** Requires `--confirm` flag to prevent accidental use

**Output:**
```
⚠️  AI Solution Generated

Module: Python Fundamentals
⚠️  Solutions used: 1 (each solution reduces final score by 1.5)

Objective: Declare and use variables

💻 AI Solution:
[Complete code solution]

⚠️  IMPORTANT: Study this solution to understand it!
   Simply copying reduces your learning and score.
```

### `codetandem review`

**Enhanced behavior:**
- Extracts TODO ID from code comments
- Calculates proficiency penalties
- Records objective completion
- Checks if ALL objectives complete
- Auto-progresses only when:
  - Score ≥ 7.0 (after penalties)
  - ALL objectives completed

## Best Practices

### For Learners

✅ **DO:**
- Try solving problems independently first
- Use hints sparingly when truly stuck
- Study AI solutions to understand WHY they work
- Complete all objectives thoroughly

❌ **DON'T:**
- Request hints before attempting the problem
- Copy AI solutions without understanding
- Rush through objectives to progress faster
- Skip understanding to just pass the score threshold

### For Educators

✅ **DO:**
- Design multiple complementary objectives per module
- Use TODO IDs consistently: `[obj-1]`, `[obj-2]`, etc.
- Set clear, measurable objectives
- Review proficiency metrics to identify struggling students

❌ **DON'T:**
- Create too many objectives (3-5 is ideal)
- Make objectives overlap significantly
- Rely solely on scores (check hints/solutions usage too)

## Comparison to Manual Workflow

### Old System (Manual)
- Single code submission per module
- Manual completion steps
- No penalty for asking for help
- Easy to skip learning

### New System (Proficiency)
- Multiple objectives required
- Automatic progression
- Penalties for excessive help
- Genuine mastery required

## Metrics and Analytics

### Student Progress Tracking

**Available metrics:**
- Objectives completed per module
- Hints used per module
- Solutions used per module
- Raw vs. adjusted scores
- Time to complete each objective
- Number of review attempts

**Example analysis:**
```
Student Performance Report:

Module: Python Fundamentals - Variables
├─ Objectives: 3/3 complete ✅
├─ Raw Score: 8.2/10.0
├─ Hints Used: 4 (-2.0 penalty)
├─ Solutions Used: 1 (-1.5 penalty)
├─ Final Score: 4.7/10.0 ❌
├─ Attempts: 5
└─ Status: Needs improvement

Recommendation: Student relies too heavily on assistance.
Encourage more independent problem-solving.
```

## Conclusion

The proficiency system ensures CodeTandem users develop genuine programming skills by:

1. **Requiring comprehensive mastery** - All objectives must be completed
2. **Penalizing over-reliance** - Hints and solutions reduce final scores
3. **Tracking granularly** - TODO IDs link code to specific objectives
4. **Preventing gaming** - Can't skip or repeat objectives for credit

**Result:** Users who complete CodeTandem modules have truly earned their progress through demonstrated proficiency.

---

**Last Updated:** December 15, 2024  
**Version:** 2.0.0  
**Status:** ✅ Implemented
