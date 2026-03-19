#!/usr/bin/env node
import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { validateConfig } from './config.js';
import { registerAllTools } from './tools/register-all.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

async function main(): Promise<void> {
  validateConfig();

  const server = new McpServer({
    name: 'testops',
    version: pkg.version,
  });

  registerAllTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
