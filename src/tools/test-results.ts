import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TestResultsApi } from '../api/test-results.js';
import { formatTestResults, formatTestResult } from '../utils/formatting.js';

export function registerTestResultTools(server: McpServer, api: TestResultsApi): void {
  server.tool(
    'list-test-results',
    'List test results in a project. Optionally filter by launch.',
    {
      projectId: z.number().describe('Project ID'),
      launchId: z.number().optional().describe('Filter by launch ID'),
      page: z.number().optional(),
      size: z.number().optional(),
    },
    async (params) => {
      const { projectId, ...rest } = params;
      const result = await api.list(projectId, rest);
      return { content: [{ type: 'text' as const, text: formatTestResults(result) }] };
    }
  );

  server.tool(
    'get-test-result',
    'Get detailed test result by ID.',
    { id: z.number().describe('Test result ID') },
    async (params) => {
      const result = await api.getById(params.id);
      return { content: [{ type: 'text' as const, text: formatTestResult(result) }] };
    }
  );

  server.tool(
    'update-test-result',
    'Update a test result (e.g., change status or add comment).',
    {
      id: z.number().describe('Test result ID'),
      status: z.string().optional().describe('New status'),
      comment: z.string().optional().describe('Comment'),
    },
    async (params) => {
      const { id, ...body } = params;
      const result = await api.update(id, body);
      return { content: [{ type: 'text' as const, text: `Test result updated:\n${formatTestResult(result)}` }] };
    }
  );
}
