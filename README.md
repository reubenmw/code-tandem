# CodeTandem

AI-powered collaborative coding CLI tool that helps you learn through pair programming with AI.

[![CI](https://github.com/reubenwestrop/code-tandem/workflows/CI/badge.svg)](https://github.com/reubenwestrop/code-tandem/actions)
[![npm version](https://badge.fury.io/js/codetandem.svg)](https://www.npmjs.com/package/codetandem)

## Features

- 🤖 **MCP Server for AI Agents** - Primary interface for Claude Code and other AI assistants via Model Context Protocol
- 📚 Curriculum-based learning with dynamic scaffolding from natural language descriptions
- 🔄 Interactive code review with AI-gated progression (score ≥ 7.0 required)
- 📊 Multi-objective proficiency tracking with transparent penalty system
- 🎯 Automatic module progression when all objectives complete
- 🔗 Task Master AI integration for project management
- 🌐 Multiple AI provider support (OpenAI, Anthropic, Google Gemini)

## Installation

### via npm (Recommended)

Install globally to use the `codetandem` command anywhere:

```bash
npm install -g codetandem
```

### via npx (No installation required)

Run without installing:

```bash
npx codetandem --help
```

### From Source

Clone the repository and build from source:

```bash
git clone https://github.com/reubenwestrop/code-tandem.git
cd code-tandem
npm install
npm run build
npm link
```

## Requirements

- Node.js 18.0.0 or higher
- An API key for at least one AI provider (OpenAI, Anthropic, or Google Gemini)

## Usage Modes

### 🚀 Primary: MCP Server (Recommended for AI Agents)

CodeTandem's MCP server is the **PRIMARY interface** for AI agents like Claude Code. AI agents can manage learning, review code, and track proficiency through the Model Context Protocol.

**Setup with Claude Desktop:**

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

**Available MCP Tools:**
- Learning management (get module, review code, get hints/solutions)
- Curriculum management (init, list modules, update settings)
- Proficiency tracking (reports, progress, remaining objectives)

**See [MCP_USAGE_GUIDE.md](./MCP_USAGE_GUIDE.md) for complete documentation.**

### 💻 CLI Interface (For Manual Use)

The CLI is available for manual interaction and curriculum generation:

## Quick Start

### 1. Initialize a Project

```bash
# Navigate to your project directory
cd ~/my-learning-project

# Initialize CodeTandem
codetandem init

# This creates:
# - .codetandem/ directory
# - .codetandem/lrd.md (Learning Requirements Document)
# - .codetandem/settings.json (Learning preferences)
```

### 2. Create Your Learning Requirements

Edit `.codetandem/lrd.md` with your learning goals in natural language:

```markdown
# React Counter App

I want to learn how to build a simple React counter application.

## What I want to learn:
- Setting up React component state with useState
- Handling button click events
- Updating state based on user interactions
```

### 3. Generate Curriculum

```bash
# Generate structured curriculum from your LRD
codetandem generate

# This creates:
# - modules.json - Structured learning modules
# - codetandem.state.json - Progress tracking
```

### 4. Start Learning (CLI or MCP)

**Using CLI:**
```bash
# Check current status
codetandem status

# Get a hint for the current objective
codetandem hint

# Review your code (PRIMARY command)
codetandem review src/Counter.tsx

# Get AI solution (with penalty)
codetandem solve --confirm
```

**Using MCP (Recommended):**
Open Zed/Claude and use the Assistant with CodeTandem MCP tools.

## Commands

### Configuration

```bash
codetandem config set <key> <value>    # Set a configuration value
codetandem config get <key>             # Get a configuration value
codetandem config show                  # Show all configuration
```

### Project Management

```bash
codetandem init                         # Initialize a new project
codetandem generate                     # Generate curriculum from LRD
codetandem status                       # Show current progress
codetandem list                         # List all modules
codetandem info                         # Display project information
```

### Learning Flow

```bash
codetandem review <file>                # Review code with AI (PRIMARY)
codetandem hint [file]                  # Get a hint (-0.5 penalty)
codetandem solve [file] --confirm       # Get AI solution (-1.5 penalty)
codetandem settings                     # View/modify preferences
codetandem set-level <level>            # Set difficulty level
```

## Learning System

### Multi-Objective Proficiency Tracking

CodeTandem uses a **transparent proficiency system** to ensure mastery:

**Requirements to Progress:**
1. Complete **ALL objectives** in a module (not just one)
2. Achieve **score ≥ 7.0** (after penalties are applied)

**TODO ID Format:**
```typescript
// TODO: [obj-1] Implement basic counter state
const [count, setCount] = useState(0);

// TODO: [obj-2] Add increment functionality  
const increment = () => setCount(count + 1);

// TODO: [obj-3] Add decrement functionality
const decrement = () => setCount(count - 1);
```

**Proficiency Scoring:**
- Base score: 0-10 (AI evaluates code quality)
- Hint penalty: -0.5 points each
- Solution penalty: -1.5 points each
- Maximum penalty: -3.0 points

**Example:**
```
Base Score: 9.0
Hints Used: 2 (penalty: -1.0)
Solutions Used: 0
Final Score: 8.0 ✓ (passes)
```

**Automatic Progression:**
When you review code with `review` command (or MCP `codetandem_review_code`):
- System records objective completion if TODO has ID
- When ALL objectives complete + score ≥ 7.0, module auto-completes
- System automatically advances to next module

See [PROFICIENCY_SYSTEM.md](./PROFICIENCY_SYSTEM.md) for details.

## Curriculum Format

Create a `.codetandem/lrd.md` (Learning Requirements Document) in natural language:

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

Or use structured markdown format:

```markdown
# Module 1: Introduction to JavaScript

- Learn basic syntax
- Understand variables and types
- Work with functions

# Module 2: Advanced Concepts

- Master async/await
- Understand closures
- Work with prototypes
```

Run `codetandem generate` to convert to structured curriculum.

## Documentation

### Complete Guides

- **[MCP_USAGE_GUIDE.md](./MCP_USAGE_GUIDE.md)** - Complete MCP server documentation (PRIMARY INTERFACE for AI agents)
- **[CLI_REFERENCE.md](./CLI_REFERENCE.md)** - Complete CLI command reference
- **[PROFICIENCY_SYSTEM.md](./PROFICIENCY_SYSTEM.md)** - Multi-objective proficiency tracking system
- **[AI_INTEGRATION_GUIDE.md](./AI_INTEGRATION_GUIDE.md)** - Integration with AI agents and Task Master
- **[MCP_SERVER_DESIGN.md](./MCP_SERVER_DESIGN.md)** - MCP server architecture and design decisions

### Setup Guides

- **[ZED_MCP_SETUP.md](./ZED_MCP_SETUP.md)** - Detailed Zed editor setup guide with troubleshooting
- **[ZED_QUICK_START.md](./ZED_QUICK_START.md)** - Quick reference for using CodeTandem in Zed

### Additional Documentation

- **[AUTOMATIC_PROGRESSION_SUMMARY.md](./AUTOMATIC_PROGRESSION_SUMMARY.md)** - Automatic module progression system
- **[PROFICIENCY_UPDATE_SUMMARY.md](./PROFICIENCY_UPDATE_SUMMARY.md)** - Proficiency system implementation details

## Configuration

CodeTandem stores configuration in your system:
- **Config file**: `~/.config/codetandem/config.json`
- **API keys**: Stored securely in system keychain (via keytar)
- **Project state**: `codetandem.state.json` in your project directory
- **Learning data**: `.codetandem/` directory (lrd.md, settings.json, modules.json)

## Development

### Setup

```bash
git clone https://github.com/reubenwestrop/code-tandem.git
cd code-tandem
npm install
```

### Build

```bash
npm run build        # Build for production
npm run dev          # Watch mode for development
```

### Testing

```bash
npm test                    # Run tests in watch mode
npm test -- --run           # Run tests once
npm run test:coverage       # Run tests with coverage
```

### Code Quality

```bash
npm run lint                # Run ESLint
npm run lint:fix            # Fix linting issues
npm run format              # Format code with Prettier
npm run typecheck           # Check TypeScript types
```

## Documentation

Comprehensive documentation is available:

- **[Getting Started Guide](./GETTING_STARTED.md)** - Complete beginner-friendly setup guide
- **[Command Reference](./docs/COMMANDS.md)** - Detailed documentation for all commands
- **[API Documentation](./docs/API.md)** - Programmatic API reference for integration
- **[FAQ](./docs/FAQ.md)** - Frequently asked questions and troubleshooting

## Architecture

### Project Structure

```
code-tandem/
├── src/
│   ├── commands/          # CLI command implementations
│   ├── providers/         # AI provider integrations
│   ├── utils/            # Utility modules
│   │   ├── config.ts     # Configuration management
│   │   ├── state.ts      # State management
│   │   ├── curriculum.ts # Curriculum parsing
│   │   ├── modules.ts    # Module management
│   │   ├── review.ts     # Code review logic
│   │   └── tandem.ts     # Core tandem loop
│   ├── types/            # TypeScript type definitions
│   ├── cli.ts            # CLI entry point
│   └── index.ts          # Library entry point
├── dist/                 # Built output
└── tests/               # Test files
```

### Key Technologies

- **TypeScript** - Type-safe development
- **Commander.js** - CLI framework
- **Cosmiconfig** - Configuration management
- **Keytar** - Secure credential storage
- **Vitest** - Testing framework
- **tsup** - Build tooling

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Support

- **Issues**: [GitHub Issues](https://github.com/reubenwestrop/code-tandem/issues)
- **Documentation**: [GitHub Wiki](https://github.com/reubenwestrop/code-tandem/wiki)

## Acknowledgments

- Built with [Task Master AI](https://github.com/task-master-ai/task-master-ai) for project management
- AI providers: OpenAI, Anthropic, Google
