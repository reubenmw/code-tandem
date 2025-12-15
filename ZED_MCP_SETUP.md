# Setting Up CodeTandem MCP Server with Zed

This guide will help you configure the CodeTandem MCP server to work with Zed editor.

## Prerequisites

1. **Zed Editor** installed on your system
2. **CodeTandem** built and ready:
   ```bash
   cd /Users/reubenwestrop/Documents/Github/code-tandem
   npm install
   npm run build
   ```

## Configuration Steps

### 1. Locate Zed MCP Configuration File

Zed stores MCP server configuration in:

**macOS:**
```
~/Library/Application Support/Zed/settings.json
```

**Linux:**
```
~/.config/zed/settings.json
```

**Windows:**
```
%APPDATA%\Zed\settings.json
```

### 2. Add CodeTandem MCP Server Configuration

Open the Zed settings file and add the `language_models` section if it doesn't exist, then add the CodeTandem MCP server:

```json
{
  "language_models": {
    "mcp_servers": {
      "codetandem": {
        "command": "node",
        "args": [
          "/Users/reubenwestrop/Documents/Github/code-tandem/dist/mcp/server.js"
        ],
        "env": {}
      }
    }
  }
}
```

**Important:** Replace `/Users/reubenwestrop/Documents/Github/code-tandem` with the actual path to your CodeTandem installation.

### 3. Alternative: Using npx (if published to npm)

If CodeTandem is published to npm or you want to use a global installation:

```json
{
  "language_models": {
    "mcp_servers": {
      "codetandem": {
        "command": "npx",
        "args": [
          "-y",
          "codetandem-mcp"
        ],
        "env": {}
      }
    }
  }
}
```

### 4. Alternative: Using npm link (for development)

If you've used `npm link` to install CodeTandem globally:

```bash
cd /Users/reubenwestrop/Documents/Github/code-tandem
npm link
```

Then in Zed settings:

```json
{
  "language_models": {
    "mcp_servers": {
      "codetandem": {
        "command": "codetandem-mcp",
        "args": [],
        "env": {}
      }
    }
  }
}
```

## Complete Example Configuration

Here's a complete Zed `settings.json` with CodeTandem MCP server:

```json
{
  "theme": "One Dark",
  "vim_mode": true,
  "language_models": {
    "mcp_servers": {
      "codetandem": {
        "command": "node",
        "args": [
          "/Users/reubenwestrop/Documents/Github/code-tandem/dist/mcp/server.js"
        ],
        "env": {}
      }
    }
  }
}
```

## Verification Steps

### 1. Restart Zed

After saving the configuration, completely quit and restart Zed:
- macOS: `Cmd+Q`
- Linux/Windows: Close all windows

### 2. Check MCP Server Status

In Zed, you can verify the MCP server is running:

1. Open the Assistant panel (usually `Cmd+Shift+A` or `Ctrl+Shift+A`)
2. The CodeTandem tools should be available to the AI assistant

### 3. Test MCP Tools

Ask the Zed assistant to list available tools:

```
What CodeTandem MCP tools are available?
```

Expected response should list the 15 CodeTandem tools:
- `codetandem_get_current_module`
- `codetandem_review_code`
- `codetandem_get_hint`
- `codetandem_get_solution`
- etc.

### 4. Test a Simple Tool Call

Ask the assistant to check your learning status:

```
Use CodeTandem to get my current learning module
```

The assistant should call `codetandem_get_current_module` and show your current module and objectives.

## Troubleshooting

### Issue: MCP Server Not Found

**Error:** "Could not start MCP server"

**Solutions:**

1. **Verify the path is correct:**
   ```bash
   ls -la /Users/reubenwestrop/Documents/Github/code-tandem/dist/mcp/server.js
   ```

2. **Check Node.js is in PATH:**
   ```bash
   which node
   # Should output: /usr/local/bin/node or similar
   ```

3. **Use absolute path to Node:**
   ```json
   {
     "language_models": {
       "mcp_servers": {
         "codetandem": {
           "command": "/usr/local/bin/node",
           "args": [
             "/Users/reubenwestrop/Documents/Github/code-tandem/dist/mcp/server.js"
           ]
         }
       }
     }
   }
   ```

### Issue: Server Starts But No Tools Available

**Solutions:**

1. **Rebuild CodeTandem:**
   ```bash
   cd /Users/reubenwestrop/Documents/Github/code-tandem
   npm run build
   ```

2. **Check build output:**
   ```bash
   ls -la dist/mcp/server.js
   # Should show file size around 60KB
   ```

3. **Test server manually:**
   ```bash
   node dist/mcp/server.js
   # Should output: "CodeTandem MCP Server running on stdio"
   ```

### Issue: "No current module in progress" Errors

This means you need to initialize a CodeTandem learning project first:

1. **Navigate to your learning project:**
   ```bash
   cd ~/my-learning-project
   ```

2. **Initialize CodeTandem:**
   ```bash
   codetandem init
   ```

3. **Create your learning requirements:**
   Edit `.codetandem/lrd.md` with your learning goals

4. **Generate curriculum:**
   ```bash
   codetandem generate
   ```

### Issue: Permission Errors

**Error:** "EACCES: permission denied"

**Solution:**

Make server.js executable:
```bash
chmod +x /Users/reubenwestrop/Documents/Github/code-tandem/dist/mcp/server.js
```

## Working Directory Configuration

The MCP server will use the current working directory where Zed is opened. To ensure CodeTandem finds your project files:

1. **Always open Zed from your learning project directory:**
   ```bash
   cd ~/my-learning-project
   zed .
   ```

2. **Or specify working directory in Zed config (if supported):**
   ```json
   {
     "language_models": {
       "mcp_servers": {
         "codetandem": {
           "command": "node",
           "args": [
             "/Users/reubenwestrop/Documents/Github/code-tandem/dist/mcp/server.js"
           ],
           "cwd": "/Users/yourname/my-learning-project"
         }
       }
     }
   }
   ```

## Using CodeTandem in Zed

Once configured, you can use CodeTandem through Zed's AI assistant:

### Example Prompts

**Get current learning module:**
```
Show me my current CodeTandem learning module
```

**Review your code:**
```
Review my Counter.tsx file with CodeTandem
```

**Check proficiency:**
```
What's my CodeTandem proficiency for the current module?
```

**Get remaining objectives:**
```
What objectives do I still need to complete in CodeTandem?
```

**Request a hint:**
```
I'm stuck on the current objective, can you get a CodeTandem hint?
```

**Track overall progress:**
```
Show my overall CodeTandem learning progress
```

## Advanced Configuration

### Enable Debug Logging

To debug MCP server issues, redirect stderr to a log file:

```json
{
  "language_models": {
    "mcp_servers": {
      "codetandem": {
        "command": "sh",
        "args": [
          "-c",
          "node /Users/reubenwestrop/Documents/Github/code-tandem/dist/mcp/server.js 2> /tmp/codetandem-mcp.log"
        ]
      }
    }
  }
}
```

Then check logs:
```bash
tail -f /tmp/codetandem-mcp.log
```

### Multiple MCP Servers

You can use CodeTandem alongside other MCP servers:

```json
{
  "language_models": {
    "mcp_servers": {
      "codetandem": {
        "command": "node",
        "args": [
          "/Users/reubenwestrop/Documents/Github/code-tandem/dist/mcp/server.js"
        ]
      },
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
      }
    }
  }
}
```

## Next Steps

1. ✅ Configure MCP server in Zed settings
2. ✅ Restart Zed
3. ✅ Verify tools are available
4. ✅ Initialize a learning project
5. ✅ Start using CodeTandem through Zed's AI assistant

For detailed usage of MCP tools, see [MCP_USAGE_GUIDE.md](./MCP_USAGE_GUIDE.md).

## Support

If you encounter issues:

1. Check Zed's console for error messages
2. Verify the server runs manually: `node dist/mcp/server.js`
3. Check the MCP server logs
4. Review [MCP_USAGE_GUIDE.md](./MCP_USAGE_GUIDE.md) for tool usage
5. Open an issue on GitHub with logs and configuration

## Quick Reference

**Zed Settings Location (macOS):**
```
~/Library/Application Support/Zed/settings.json
```

**Minimal Configuration:**
```json
{
  "language_models": {
    "mcp_servers": {
      "codetandem": {
        "command": "node",
        "args": ["/ABSOLUTE/PATH/TO/code-tandem/dist/mcp/server.js"]
      }
    }
  }
}
```

**Verify Server:**
```bash
node /ABSOLUTE/PATH/TO/code-tandem/dist/mcp/server.js
# Should output: "CodeTandem MCP Server running on stdio"
```
