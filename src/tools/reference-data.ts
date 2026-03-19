import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ReferenceDataApi } from '../api/reference-data.js';
import { formatTestLayers, formatWorkflows } from '../utils/formatting.js';

export function registerReferenceDataTools(server: McpServer, api: ReferenceDataApi): void {
  server.tool(
    'list-test-layers',
    'List available test layers (e.g. UI, API, Unit). Use the returned IDs when setting testLayerId in create-test-case or update-test-case.',
    {
      page: z.number().optional().describe('Page number (0-based)'),
      size: z.number().optional().describe('Page size'),
    },
    async (params) => {
      const result = await api.listTestLayers(params);
      return { content: [{ type: 'text' as const, text: formatTestLayers(result) }] };
    }
  );

  server.tool(
    'list-workflows',
    'List available workflows with their statuses (e.g. Active, Draft, Deprecated). Use status IDs when setting statusId in create-test-case or update-test-case.',
    {
      page: z.number().optional().describe('Page number (0-based)'),
      size: z.number().optional().describe('Page size'),
    },
    async (params) => {
      const result = await api.listWorkflows(params);
      return { content: [{ type: 'text' as const, text: formatWorkflows(result) }] };
    }
  );
}
