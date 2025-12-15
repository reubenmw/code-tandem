# CodeTandem Frequently Asked Questions (FAQ)

## General Questions

### What is CodeTandem?

CodeTandem is an AI-powered collaborative coding CLI tool designed to help you learn programming through guided exercises with intelligent feedback. It provides adaptive scaffolding based on your skill level and works with multiple AI providers (OpenAI, Anthropic Claude, Google Gemini).

### Who is CodeTandem for?

CodeTandem is ideal for:
- Self-learners who want structured guidance
- Coding bootcamp students
- Educators creating custom learning paths
- Developers learning new languages or frameworks
- Anyone who wants AI-assisted coding practice

### How is CodeTandem different from ChatGPT or other AI coding assistants?

CodeTandem provides:
- **Structured learning paths** with curriculum management
- **Progress tracking** and skill score monitoring
- **Adaptive scaffolding** that adjusts to your level
- **Context-aware assistance** based on your current module
- **File-based TODO integration** for seamless workflow
- **Automated code review** with constructive feedback

## Installation & Setup

### What are the system requirements?

- Node.js 18.0.0 or higher
- npm or npx
- An API key from at least one AI provider (OpenAI, Anthropic, or Google)

### How do I get an API key?

**OpenAI:**
1. Visit https://platform.openai.com/
2. Sign up or log in
3. Go to API Keys section
4. Create new secret key

**Anthropic (Claude):**
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys
4. Generate new key

**Google (Gemini):**
1. Visit https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Create API key

### Where are my API keys stored?

API keys are stored securely in your system's keychain:
- **macOS**: Keychain Access
- **Windows**: Credential Vault
- **Linux**: Secret Service API (libsecret)

They are never stored in plain text files.

### Can I use CodeTandem without installing it globally?

Yes! Use npx:

```bash
npx codetandem init
npx codetandem start
```

## Usage Questions

### How do I create a custom curriculum?

Edit the `curriculum.md` file using this structure:

```markdown
# Module Title

Brief description (optional)

## Objective 1
- Sub-task or requirement
- Another sub-task

## Objective 2
- Task description
```

Then run:
```bash
codetandem generate
```

### What programming languages does CodeTandem support?

CodeTandem works with any programming language! The AI providers understand all major languages including:
- JavaScript/TypeScript
- Python
- Java
- C/C++
- Go
- Rust
- Ruby
- PHP
- And many more

### How does the skill scoring system work?

Skill scores range from 0.0 to 10.0:
- **0-3**: Beginner - Detailed step-by-step guidance
- **3-7**: Intermediate - Goal-oriented assistance
- **7-10**: Advanced - Conceptual guidance and best practices

Scores are automatically adjusted based on code review results.

### Can I work on multiple projects simultaneously?

Yes! Each directory can have its own CodeTandem configuration. Simply run `codetandem init` in each project directory.

### What happens if I lose my progress?

Your progress is stored in `codetandem.state.json`. As long as this file exists, your progress is preserved. We recommend:
- Adding it to version control (if working alone)
- Backing it up regularly
- Using cloud-synced directories

### How do TODO comments work?

CodeTandem recognizes standard TODO comment formats:

```javascript
// TODO: implement validation
// TODO implement validation
// todo: add error handling
```

It reads the text after `TODO:` to understand what help you need.

## AI Provider Questions

### Which AI provider should I use?

**Choose based on your needs:**

**OpenAI (GPT-4):**
- ✅ Excellent code generation
- ✅ Strong debugging capabilities
- ✅ Well-established
- ❌ Can be expensive

**Anthropic (Claude):**
- ✅ Excellent at explaining concepts
- ✅ Strong reasoning capabilities
- ✅ Good value for money
- ✅ Longer context windows

**Google (Gemini):**
- ✅ Fast responses
- ✅ Cost-effective
- ✅ Good for simple tasks
- ❌ Newer, less proven for complex code

### Can I switch providers mid-project?

Yes! Simply run:

```bash
codetandem config set-provider <provider>
codetandem config set-key <provider> <key>
```

Your progress and state will be preserved.

### How much do the AI providers cost?

Costs vary by provider and model. As of 2024:

**OpenAI GPT-4:**
- ~$0.03 per 1K tokens (input)
- ~$0.06 per 1K tokens (output)

**Anthropic Claude:**
- ~$0.015 per 1K tokens (input)
- ~$0.075 per 1K tokens (output)

**Google Gemini:**
- Free tier available
- Pro tier: ~$0.001 per 1K tokens

Typical usage: 50-200 review sessions might cost $5-20 depending on provider and model.

### Can I use local AI models?

Currently, CodeTandem requires cloud-based AI providers. Local model support is planned for future releases.

## Troubleshooting

### "API key not found" error

**Solution:**
```bash
# Verify configuration
codetandem config show

# Re-set your API key
codetandem config set-key <provider> <key>
```

### "Module not found" error

**Solution:**
```bash
# Regenerate modules
codetandem generate

# Check modules.json exists
cat modules.json
```

### "Invalid state.json" error

**Solution:**
```bash
# Backup current state
cp codetandem.state.json backup.state.json

# Reinitialize
codetandem init --force
```

### Reviews are too strict/lenient

**Solution:**
Adjust the temperature parameter:

```bash
# More strict/focused (lower temperature)
codetandem review file.js --temperature 0.1

# More creative/lenient (higher temperature)
codetandem review file.js --temperature 0.8
```

### CodeTandem is slow

**Possible causes and solutions:**

1. **Large files**: Review specific TODOs instead of entire files
   ```bash
   codetandem review file.js --todo "specific section"
   ```

2. **Slow AI provider**: Try a faster model
   ```bash
   codetandem config set-model gpt-3.5-turbo  # OpenAI
   codetandem config set-model claude-3-haiku-20240307  # Anthropic
   ```

3. **Network issues**: Check internet connection and provider status

### Can't find codetandem command after installation

**Solution:**
```bash
# If installed locally
npm link

# If installed globally
npm install -g codetandem

# Or use npx
npx codetandem --help
```

## Advanced Usage

### Can I customize the AI prompts?

Not directly through the CLI, but you can use the programmatic API to build custom prompts:

```typescript
import { buildReviewPrompt, reviewCodeWithAI } from 'codetandem';

const customPrompt = buildReviewPrompt(extraction, 'Custom context', 'Custom objective');
// Modify customPrompt as needed
```

### Can I integrate CodeTandem with my IDE?

CodeTandem works via CLI, so you can:
- Run commands from your IDE's terminal
- Create IDE tasks/scripts
- Use IDE extensions that support CLI tools

VS Code example tasks.json:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "CodeTandem Review",
      "type": "shell",
      "command": "codetandem review ${file}"
    }
  ]
}
```

### How do I use CodeTandem in a CI/CD pipeline?

```yaml
# GitHub Actions example
name: Code Review
on: [push]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install -g codetandem
      - run: codetandem config set-key openai ${{ secrets.OPENAI_API_KEY }}
      - run: codetandem review src/**/*.js
```

### Can I export my progress or generate reports?

```bash
# Get progress as JSON
codetandem status --json > progress.json

# Use programmatic API for custom reports
```

See the [API documentation](./API.md) for more details.

### Can I use CodeTandem for team learning?

Yes! Options include:
1. **Shared curriculum**: Same curriculum.md for all team members
2. **Individual progress**: Each person tracks their own state
3. **Code reviews**: Review each other's code with consistent AI feedback
4. **Version control**: Commit curriculum and share learning paths

## Privacy & Security

### Is my code sent to AI providers?

Yes, when you use `start` or `review` commands, relevant code snippets are sent to the AI provider you've configured. Only the specific code around TODOs is sent, not your entire codebase.

### Can I use CodeTandem offline?

No, CodeTandem requires internet connection to communicate with AI providers. Local model support is planned for future releases.

### What data does CodeTandem collect?

CodeTandem itself collects no telemetry or usage data. However:
- AI providers may log API requests (check their privacy policies)
- Your code is sent to AI providers for analysis
- API keys are stored locally in your system keychain

### Is it safe to use with proprietary code?

Consider:
- Code snippets are sent to third-party AI services
- Review AI provider terms of service and data retention policies
- For sensitive code, consider:
  - Using anonymized examples
  - Working with open-source projects
  - Waiting for local model support

## Project Management

### Can I have multiple curriculums in one project?

Not directly, but you can:
1. Create multiple project directories
2. Use git branches with different curricula
3. Manually switch curriculum files and regenerate

### How do I reset my progress?

```bash
# Complete reset
rm codetandem.state.json
codetandem init

# Or edit state.json manually to reset specific values
```

### Can I skip modules?

```bash
# Jump to any module
codetandem goto <module-id>

# Or edit state.json to change currentModuleId
```

### How do I share my curriculum with others?

Simply share the `curriculum.md` file! Others can:
1. Copy it to their project
2. Run `codetandem generate`
3. Start learning with the same curriculum

## Contributing & Development

### Can I contribute to CodeTandem?

Yes! CodeTandem is open source. Visit the [GitHub repository](https://github.com/reubenwestrop/code-tandem) to:
- Report issues
- Submit pull requests
- Suggest features
- Improve documentation

### How do I add support for a new AI provider?

Implement the `BaseAIProvider` abstract class:

```typescript
import { BaseAIProvider } from 'codetandem';

class MyProvider extends BaseAIProvider {
  async generateCodeSuggestion(prompt, context, temperature) {
    // Your implementation
  }
  
  async reviewCode(codeSnippet, context) {
    // Your implementation
  }
  
  async chat(messages, temperature) {
    // Your implementation
  }
}
```

See [API documentation](./API.md) for details.

### Where can I find the source code?

https://github.com/reubenwestrop/code-tandem

### How is CodeTandem licensed?

CodeTandem is released under the MIT License, which means you can:
- Use it commercially
- Modify it
- Distribute it
- Use it privately

## Future Features

### What features are planned?

Potential future enhancements include:
- Local AI model support (Ollama, LM Studio)
- Web dashboard for progress tracking
- Team collaboration features
- More AI provider integrations
- Video tutorial integration
- Gamification features
- Mobile app

### How can I request a feature?

Open an issue on [GitHub](https://github.com/reubenwestrop/code-tandem/issues) with:
- Feature description
- Use case
- Example of how it would work

## Getting More Help

### Where can I find more documentation?

- [Getting Started Guide](../GETTING_STARTED.md)
- [Command Reference](./COMMANDS.md)
- [API Documentation](./API.md)
- [README](../README.md)

### How do I report a bug?

1. Check if it's already reported: https://github.com/reubenwestrop/code-tandem/issues
2. If not, create a new issue with:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - System information (OS, Node version)
   - CodeTandem version (`codetandem --version`)

### Where can I get community support?

- GitHub Discussions (coming soon)
- GitHub Issues for bug reports
- Stack Overflow tag: `codetandem` (coming soon)

### Can I hire someone to help me set up CodeTandem?

While CodeTandem is designed to be self-service, you can:
- Post in freelance platforms for Node.js/CLI experts
- Check if there are consultants familiar with the tool
- Reach out to the maintainers for professional support options

---

**Didn't find your question?**

Please [open an issue](https://github.com/reubenwestrop/code-tandem/issues) with your question, and we'll add it to this FAQ!
