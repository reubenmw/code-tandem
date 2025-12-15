# Getting Started with CodeTandem

CodeTandem is an AI-powered collaborative coding CLI tool that helps you learn programming through guided exercises with intelligent feedback and adaptive scaffolding.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Setting Up Your First Project](#setting-up-your-first-project)
- [Understanding Curriculum Files](#understanding-curriculum-files)
- [Working with CodeTandem](#working-with-codetandem)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

## Installation

### Option 1: Install via npm (Recommended)

```bash
npm install -g codetandem
```

### Option 2: Use with npx (No installation needed)

```bash
npx codetandem --help
```

### Option 3: Install from source

```bash
git clone https://github.com/reubenwestrop/code-tandem.git
cd code-tandem
npm install
npm run build
npm link
```

## Quick Start

### 1. Configure Your AI Provider

CodeTandem supports three AI providers: OpenAI, Anthropic (Claude), and Google Gemini.

#### OpenAI Setup

```bash
# Set API key
codetandem config set-key openai YOUR_API_KEY

# Set provider and model
codetandem config set-provider openai
codetandem config set-model gpt-4
```

#### Anthropic (Claude) Setup

```bash
# Set API key
codetandem config set-key anthropic YOUR_API_KEY

# Set provider and model
codetandem config set-provider anthropic
codetandem config set-model claude-3-opus-20240229
```

#### Google Gemini Setup

```bash
# Set API key
codetandem config set-key google YOUR_API_KEY

# Set provider and model
codetandem config set-provider google
codetandem config set-model gemini-pro
```

### 2. Verify Your Configuration

```bash
codetandem config show
```

You should see output similar to:

```
Current Configuration:
  Provider: openai
  Model: gpt-4
  API Keys:
    openai: ****
```

### 3. Initialize a Project

```bash
# Create a new directory for your learning project
mkdir my-coding-journey
cd my-coding-journey

# Initialize CodeTandem
codetandem init
```

This creates:
- `.codetandem/` directory for project data
- `curriculum.md` - Your learning curriculum
- `modules.json` - Parsed curriculum structure
- `codetandem.state.json` - Your progress tracker

## Setting Up Your First Project

### Create a Curriculum

Edit the generated `curriculum.md` file to define your learning path:

```markdown
# JavaScript Fundamentals

Learn the basics of JavaScript programming

## Variables and Data Types

- Declare variables using let and const
- Use different data types (string, number, boolean)
- Perform basic operations with variables

## Functions

- Define and call functions
- Use function parameters and return values
- Understand function scope

## Arrays and Objects

- Create and manipulate arrays
- Access array elements
- Create and work with objects
```

### Generate Module Structure

```bash
codetandem generate
```

This parses your curriculum and creates `modules.json`.

### Start Coding

```bash
# Begin the first module
codetandem start

# Or specify a specific file to work on
codetandem start src/variables.js
```

## Understanding Curriculum Files

### Curriculum Format

The `curriculum.md` file uses a specific markdown structure:

```markdown
# [Module Title]

[Module description - optional]

## [Objective 1]

- [Sub-objective or requirement]
- [Another sub-objective]

## [Objective 2]

- [Sub-objective]
```

**Rules:**
- Level 1 headings (`#`) define modules
- Level 2 headings (`##`) define objectives
- List items define sub-objectives or requirements
- Module IDs are auto-generated from titles (lowercase, hyphenated)

### Example Curriculum

```markdown
# Introduction to Python

Master the fundamentals of Python programming

## Print and Input

- Use the print() function to display output
- Get user input with input()
- Format strings with f-strings

## Conditional Statements

- Write if/else statements
- Use comparison operators
- Implement elif chains

## Loops

- Use for loops to iterate
- Implement while loops
- Use break and continue statements
```

## Working with CodeTandem

### The Coding Loop

1. **Start a session**: `codetandem start [file]`
2. **Add TODO comments** in your code where you need help
3. **Get AI suggestions**: CodeTandem reads your TODOs and provides context-aware help
4. **Implement solutions**: Write code based on the guidance
5. **Review your code**: `codetandem review [file]`
6. **Iterate**: Refine based on feedback

### Adding TODOs

CodeTandem looks for TODO comments in your code:

```javascript
// TODO: implement function to calculate average
function calculateAverage(numbers) {
  // Your code here
}
```

### Starting a Coding Session

```bash
# Start with current module context
codetandem start

# Work on a specific file
codetandem start src/calculator.js

# Work on a specific objective
codetandem start --objective 1
```

### Reviewing Your Code

```bash
# Review entire file
codetandem review src/calculator.js

# Review specific TODO
codetandem review src/calculator.js --todo "calculate average"
```

### Tracking Progress

```bash
# View current status
codetandem status

# Mark current module as complete
codetandem complete

# Move to next module
codetandem next

# Jump to a specific module
codetandem goto loops
```

### Hints System

If you're stuck, request hints:

```bash
codetandem hint

# Get a more detailed hint
codetandem hint --level 2
```

## Advanced Features

### Dynamic Scaffolding

CodeTandem adapts its guidance based on your skill level:

- **Beginner (< 3.0)**: Detailed step-by-step instructions with code examples
- **Intermediate (3.0-7.0)**: Goal-oriented guidance with strategy suggestions
- **Advanced (> 7.0)**: Conceptual guidance and best practices

Your skill score is tracked automatically based on code reviews.

### Configuration Management

```bash
# View all configuration
codetandem config show

# Set custom configuration values
codetandem config set difficultyOverride medium

# Get specific config value
codetandem config get provider

# Remove API key
codetandem config remove-key openai
```

### Project Regeneration

If you need to reset or update your project structure:

```bash
# Regenerate modules.json from curriculum.md
codetandem generate

# Regenerate with custom paths
codetandem generate --curriculum ./docs/curriculum.md --output ./config/modules.json
```

### Multiple Projects

Each directory can have its own CodeTandem configuration:

```bash
# Project 1
cd ~/projects/learn-python
codetandem init
codetandem config set-provider openai

# Project 2
cd ~/projects/learn-javascript
codetandem init
codetandem config set-provider anthropic
```

### Task Master Integration

CodeTandem can integrate with Task Master AI for enhanced project management:

```bash
# Initialize Task Master in your project
taskmaster init

# CodeTandem will automatically sync with Task Master if detected
```

## Troubleshooting

### API Key Issues

**Problem**: "API key not found" error

**Solution**:
```bash
# Verify your key is set
codetandem config show

# Re-set the API key
codetandem config set-key openai YOUR_API_KEY
```

### Module Not Found

**Problem**: "Module with ID 'xyz' not found"

**Solution**:
```bash
# Regenerate modules
codetandem generate

# Check module IDs
cat modules.json
```

### State File Errors

**Problem**: "Invalid state.json" errors

**Solution**:
```bash
# Backup current state
cp codetandem.state.json codetandem.state.json.backup

# Reinitialize
codetandem init --force
```

### Provider Connection Issues

**Problem**: "Failed to connect to AI provider"

**Solution**:
1. Check your internet connection
2. Verify API key is valid
3. Check provider status page:
   - OpenAI: https://status.openai.com/
   - Anthropic: https://status.anthropic.com/
   - Google: https://status.cloud.google.com/

### File Not Found Errors

**Problem**: "File not found" when running commands

**Solution**:
```bash
# Make sure you're in the project directory
cd /path/to/your/project

# Verify initialization
ls -la .codetandem/
```

## Getting Help

### Command Help

```bash
# General help
codetandem --help

# Command-specific help
codetandem start --help
codetandem review --help
codetandem config --help
```

### Community and Support

- **GitHub Issues**: https://github.com/reubenwestrop/code-tandem/issues
- **Documentation**: https://github.com/reubenwestrop/code-tandem#readme

## Next Steps

Now that you're set up:

1. **Create your curriculum** - Design a learning path that suits your goals
2. **Start coding** - Begin with simple exercises and build up
3. **Review regularly** - Use the review feature to get feedback
4. **Track progress** - Monitor your skill development over time
5. **Experiment** - Try different AI providers and models to find what works best for you

Happy coding! 🚀
