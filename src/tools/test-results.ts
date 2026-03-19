import { z } from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TestResultsApi } from '../api/test-results.js';
import { formatTestResults, formatTestResult } from '../utils/formatting.js';
import { config, resolveProjectId } from '../config.js';
import { withErrorHandler } from '../utils/error-handler.js';

export function registerTestResultTools(server: McpServer, api: TestResultsApi, readOnly = false): void {
  const projectIdSchema = config.projectId
    ? z.number().optional().describe('Project ID (optional if TESTOPS_PROJECT_ID is set)')
    : z.number().describe('Project ID (required)');

  server.registerTool(
    'list-test-results',
    {
      description: 'List test results in a project. Optionally filter by launch.',
      inputSchema: z.object({
        projectId: projectIdSchema,
        launchId: z.number().describe('Launch ID (required by API)'),
        page: z.number().optional(),
        size: z.number().optional(),
      }),
    },
    withErrorHandler(async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const { projectId: _, ...rest } = params;
      const result = await api.list(projectId, rest);
      return { content: [{ type: 'text' as const, text: formatTestResults(result) }] };
    })
  );

  server.registerTool(
    'get-test-result',
    {
      description: 'Get detailed test result by ID.',
      inputSchema: z.object({
        id: z.number().describe('Test result ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getById(params.id);
      return { content: [{ type: 'text' as const, text: formatTestResult(result) }] };
    })
  );

  if (!readOnly) {
    server.registerTool(
      'update-test-result',
      {
        description: 'Update a test result (e.g., change status or add comment).',
        inputSchema: z.object({
          id: z.number().describe('Test result ID'),
          status: z.string().optional().describe('New status'),
          comment: z.string().optional().describe('Comment'),
        }),
      },
      withErrorHandler(async (params) => {
        const { id, ...body } = params;
        const result = await api.update(id, body);
        return { content: [{ type: 'text' as const, text: `Test result updated:\n${formatTestResult(result)}` }] };
      })
    );
  }
}
