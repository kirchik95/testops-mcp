#!/usr/bin/env node
import { createRequire } from 'node:module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { validateConfig } from './config.js';
import { registerAllTools } from './tools/register-all.js';
import { logEvent } from './utils/logger.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

async function main(): Promise<void> {
  validateConfig();
  logEvent('info', 'server.starting', {
    serverName: 'testops',
    version: pkg.version,
  });

  const server = new McpServer({
    name: 'testops',
    version: pkg.version,
  });

  registerAllTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logEvent('info', 'server.ready', {
    serverName: 'testops',
    version: pkg.version,
  });
}

main().catch((error) => {
  logEvent('error', 'server.fatal', {
    error,
  });
  process.exit(1);
});
