# AI-Gated Automatic Progression System

## Overview

CodeTandem implements a **fully automatic** AI-gated progression system where progression happens seamlessly based on code quality. When users submit code that meets quality standards, the system automatically completes the current module and advances to the next one. No manual intervention required.

## Core Principle

**"The AI reviews solutions and automatically progresses users when they meet quality standards."**

The process is completely automatic:
1. User works on module objectives
2. User submits code for AI review
3. AI analyzes and scores the code (0-10 scale)
4. **If score ≥ 7.0**: Module auto-completes, user auto-advances to next module
5. **If score < 7.0**: User receives feedback and stays on current module

## How It Works

### 1. Automatic Module Workflow

```
┌─────────────────────┐
│  Start Module       │
│  (codetandem start) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Work on Code       │
│  (write/edit files) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Submit for Review  │
│  (codetandem review)│
└──────────┬──────────┘
           │
           ▼
     ┌────┴────┐
     │   AI    │
     │ Analyzes│
     │  & Scores│
     └────┬────┘
          │
          ▼
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌───────────┐   ┌────────────────┐
│Score < 7.0│   │Score ≥ 7.0     │
│           │   │                │
│Stay on    │   │AUTO-COMPLETE   │
│Module     │   │Module          │
│           │   │                │
│Receive    │   │AUTO-ADVANCE    │
│Feedback   │   │to Next Module  │
└─────┬─────┘   └────────┬───────┘
      │                  │
      │                  ▼
      │         ┌─────────────────┐
      │         │Display Next     │
      │         │Module Objectives│
      │         └────────┬────────┘
      │                  │
      │                  ▼
      │         ┌─────────────────┐
      │         │Ready for Next   │
      │         │Module           │
      │         └─────────────────┘
      │
      └────► Back to "Work on Code"
           (improve and resubmit)
```

**Key Point:** No manual `complete` or `next` commands needed - progression is automatic!

### 2. State Management

The system tracks progress in `codetandem.state.json`:

```json
{
  "currentModuleId": "module-2",
  "completedModules": ["module-1"],
  "skillScores": {
    "module-1": 7.5,
    "module-2": 0
  },
  "assessmentPending": true
}
```

**Key fields:**
- `currentModuleId`: Module user is currently working on
- `completedModules`: List of modules user has completed (auto-updated on approval)
- `skillScores`: Current score for each module (0-10 scale)
- `assessmentPending`: Reset to `true` when advancing to new module

### 3. Approval Criteria

AI grants approval when **ALL** conditions are met:

| Criterion | Requirement |
|-----------|-------------|
| **Review Success** | Code passes AI review (`success: true`) |
| **Skill Score** | Score ≥ 7.0 out of 10.0 |
| **Code Quality** | Meets module objectives |
| **Best Practices** | Follows language conventions |

## Command Behavior

### `codetandem review <file>`

**Purpose:** Submit code for AI review with automatic progression

**What it does:**
1. Analyzes code quality
2. Provides detailed feedback
3. Assigns skill score (0-10)
4. **Automatically completes module and advances if approved**

**Auto-progression when approved:**
```bash
$ codetandem review src/calculator.py

🔍 Code Review Session

File: src/calculator.py
Module: Python Fundamentals - Variables
Current Skill: 5.2/10.0

🤖 Analyzing your code...
──────────────────────────────────────────────────────────
✅ Great work! Your code looks good.

Feedback:
Your variable declarations are clear and follow conventions.

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

Progress: 1/10 modules

  Run: codetandem start (to begin)
```

**Stays on module when not approved:**
```bash
$ codetandem review src/calculator.py

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
3. Run: codetandem review src/calculator.py (to check again)
```

**Implementation:** `src/commands/review.ts:169`
```typescript
if (review.success && review.score >= 7.0) {
  const isAlreadyCompleted = state.completedModules.includes(currentModuleId);
  
  if (!isAlreadyCompleted) {
    // Auto-complete current module
    await updateState('./codetandem.state.json', {
      completedModuleId: currentModuleId,
    });
    
    // Auto-advance to next module
    const nextModule = modules[currentIndex + 1];
    await updateState('./codetandem.state.json', {
      currentModuleId: nextModule.id,
      assessmentPending: true,
    });
    
    // Display completion and next module info
  }
}
```

---

### `codetandem complete` *(deprecated)*

**Status:** This command is no longer needed - modules auto-complete on AI approval.

**Note:** The command still exists for backward compatibility and manual override (with `--force` flag), but is not part of the normal workflow. Progression happens automatically through the `review` command.

---

### `codetandem next` *(deprecated)*

**Status:** This command is no longer needed - users auto-advance to next module on approval.

**Note:** The command still exists for backward compatibility and manual navigation, but is not part of the normal workflow. The `review` command handles all progression automatically.

## Protection Mechanisms

### 1. Quality Threshold

Users **must** achieve a minimum score to progress.

**Enforcement:**
- Score ≥ 7.0 required for module completion
- Review must be successful (`success: true`)
- Both criteria checked automatically in review command
- No progression until standards met

### 2. No Module Skipping

Users **cannot** jump ahead - progression is sequential and automatic.

**Enforcement:**
- `currentModuleId` updated only after current module completion
- `completedModules` array tracks finished modules
- Sequential progression enforced through review command
- Users stay on current module until code meets standards

### 3. Fresh Evaluation Per Module

Each module requires earning approval - no carrying over previous scores.

**Enforcement:**
- `assessmentPending` reset to `true` when advancing to new module
- Skill score starts at 0 for each new module
- Users must submit code for review for each module
- Cannot skip review process

### 4. Automatic State Management

State updates happen automatically - no manual manipulation needed.

**What happens automatically:**
- Skill scores updated on every review
- Module completion tracked when score ≥ 7.0
- Progress to next module immediately after completion
- Assessment pending flag reset for new modules

## User Experience Flow

### Simplified Automatic Flow

```bash
# 1. Initialize project
$ codetandem init

# 2. Edit lrd.md with learning goal

# 3. Generate curriculum
$ codetandem generate-curriculum

# 4. Start first module
$ codetandem start
🎯 Current Module: Python Fundamentals - Variables

# 5. Write code...
# (edit files, complete objectives)

# 6. Submit for review (first attempt)
$ codetandem review src/basics.py
⚠️  Not quite there yet
  Need: score ≥ 7.0 (current: 5.2)

# 7. Improve code based on feedback...

# 8. Submit again - AUTOMATIC PROGRESSION!
$ codetandem review src/basics.py

✅ Great work! Your code looks good.
Score: 7.5/10.0

🎉 MODULE COMPLETED!
✓ Python Fundamentals - Variables

📚 Moving to next module...
Now Learning: Python Fundamentals - Data Types

# 9. Continue with next module - just repeat steps 4-8!
$ codetandem start
🎯 Current Module: Python Fundamentals - Data Types
```

**Key Difference:** No manual `complete` or `next` commands - everything happens automatically when your code meets standards!

## Benefits

### For Learners

✅ **Seamless Experience** - No manual completion steps needed  
✅ **Instant Progression** - Advance immediately when ready  
✅ **Genuine Learning** - Cannot skip ahead without understanding  
✅ **Quality Feedback** - AI provides constructive reviews  
✅ **Skill Development** - Must reach competency (≥7.0) before advancing  
✅ **Confidence Building** - Automatic progression validates real achievement  
✅ **Structured Path** - Clear, linear progression through curriculum  
✅ **Less Friction** - Focus on learning, not managing workflow

### For Educators

✅ **Quality Assurance** - Students earn their progress automatically  
✅ **Objective Assessment** - AI provides consistent evaluation  
✅ **Progress Tracking** - Clear visibility into student advancement  
✅ **Reduced Cheating** - Cannot skip without demonstrating skills  
✅ **Automated Grading** - AI handles code review and progression at scale  
✅ **Simplified Workflow** - No manual approval or advancement steps

## Technical Details

### State Schema

```typescript
interface State {
  currentModuleId: string;
  completedModules: string[];
  skillScores: Record<string, number>; // moduleId -> score (0-10)
  assessmentPending?: boolean; // true = locked, false = approved
  version: string;
}
```

### Review Response Schema

```typescript
interface ReviewResult {
  success: boolean;        // Did code pass review?
  feedback: string;        // Detailed feedback
  suggestions?: string[];  // Improvement suggestions
  score?: number;          // 0-10 skill score
}
```

### Approval Logic

```typescript
// Grant approval if:
const canApprove = review.success && review.score >= 7.0;

if (canApprove) {
  await updateState('./codetandem.state.json', {
    assessmentPending: false,
    skillScore: review.score,
  });
}
```

### Completion Validation

```typescript
// Validate before completion:
const assessmentPending = state.assessmentPending ?? true;
const skillScore = state.skillScores[currentModuleId] || 0;

const canComplete = !assessmentPending && skillScore >= 7.0;

if (!canComplete) {
  throw new Error('AI approval required');
}
```

## Future Enhancements

### Planned Features

1. **Progressive Difficulty** - Adjust requirements based on module complexity
2. **Multiple Attempts Tracking** - Track how many reviews before approval
3. **Time Tracking** - Record time spent per module
4. **Achievement System** - Badges for first-attempt approvals, high scores
5. **Peer Review** - Optional human review in addition to AI
6. **Custom Thresholds** - Allow educators to set approval score (default: 7.0)
7. **Partial Credit** - Save progress on individual objectives
8. **Review History** - Track all review attempts and improvements

## Troubleshooting

### "AI approval required" but I got approval

**Solution:** Check state file
```bash
cat codetandem.state.json | grep assessmentPending
# Should be: "assessmentPending": false
```

If still `true`, re-run review:
```bash
codetandem review <file>
```

### Score is 7.0+ but still locked

**Solution:** Ensure review was successful
```bash
codetandem review <file>
# Must show: "✅ Great work! Your code looks good."
# Not: "⚠️  Your code needs some improvements."
```

### Want to reset approval for testing

**Solution:** Manually edit state
```bash
# Edit codetandem.state.json
{
  "assessmentPending": true  // Lock module
}
```

Or delete state and regenerate:
```bash
rm codetandem.state.json
codetandem generate-curriculum
```

## Summary

CodeTandem's AI-gated automatic progression system ensures that learning is genuine and skills are truly developed. The system seamlessly progresses users when their code meets quality standards (score ≥ 7.0), eliminating manual steps while maintaining quality gates. This creates a frictionless, quality-focused learning experience that builds real programming skills.

**Key Takeaway:** The AI automatically manages progression - users focus on writing quality code, and advancement happens seamlessly when standards are met.

**Workflow Summary:**
1. Work on code → 2. Submit for review → 3. If approved (≥7.0): Auto-complete & auto-advance → 4. Repeat!

No manual `complete` or `next` commands needed - just write code and let the AI handle the rest.

---

**Last Updated:** December 15, 2024  
**Version:** 1.0.0  
**Related Files:**
- `src/commands/review.ts` - AI review and approval
- `src/commands/index.ts` - Complete and next commands
- `NEW_USER_FLOW.md` - Overall user flow documentation
