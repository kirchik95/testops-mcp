import { z } from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReferenceDataApi } from '../api/reference-data.js';
import { formatTestLayers, formatWorkflows } from '../utils/formatting.js';
import { withErrorHandler } from '../utils/error-handler.js';

export function registerReferenceDataTools(server: McpServer, api: ReferenceDataApi): void {
  server.registerTool(
    'list-test-layers',
    {
      description: 'List available test layers (e.g. UI, API, Unit). Use the returned IDs when setting testLayerId in create-test-case or update-test-case.',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number (0-based)'),
        size: z.number().optional().describe('Page size'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.listTestLayers(params);
      return { content: [{ type: 'text' as const, text: formatTestLayers(result) }] };
    })
  );

  server.registerTool(
    'list-workflows',
    {
      description: 'List available workflows with their statuses (e.g. Active, Draft, Deprecated). Use status IDs when setting statusId in create-test-case or update-test-case.',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number (0-based)'),
        size: z.number().optional().describe('Page size'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.listWorkflows(params);
      return { content: [{ type: 'text' as const, text: formatWorkflows(result) }] };
    })
  );
}
