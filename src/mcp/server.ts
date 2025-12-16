#!/usr/bin/env node
/**
 * CodeTandem MCP Server
 *
 * Provides Model Context Protocol interface for AI agents to interact with CodeTandem.
 * This is the PRIMARY interface for using CodeTandem - AI agents should use this
 * instead of calling CLI commands directly.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { learningTools } from './tools/learning.js';
import { curriculumTools } from './tools/curriculum.js';
import { proficiencyTools } from './tools/proficiency.js';
import { projectTools } from './tools/project.js';
import { listResources, readResource } from './resources/index.js';

// Server configuration
const server = new Server(
  {
    name: 'codetandem-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Combine all tools
const allTools: Record<string, any> = {
  ...learningTools,
  ...curriculumTools,
  ...proficiencyTools,
  ...projectTools,
};

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(allTools).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const tool = allTools[toolName];

  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  try {
    const result = await tool.handler(request.params.arguments || {});
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * List available resources
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = await listResources();
  return { resources };
});

/**
 * Read resource content
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const content = await readResource(request.params.uri);
  return { contents: content };
});

/**
 * Start server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is used for MCP protocol)
  console.error('CodeTandem MCP Server running on stdio');
  console.error('Available tools:', Object.keys(allTools).length);
  console.error('Primary interface for AI agents');
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
