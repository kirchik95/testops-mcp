import { z } from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { LaunchesApi } from '../api/launches.js';
import { formatLaunches, formatLaunch, formatTestResults } from '../utils/formatting.js';
import { config, resolveProjectId } from '../config.js';
import { withErrorHandler } from '../utils/error-handler.js';

export function registerLaunchTools(server: McpServer, api: LaunchesApi): void {
  const projectIdSchema = config.projectId
    ? z.number().optional().describe('Project ID (optional if TESTOPS_PROJECT_ID is set)')
    : z.number().describe('Project ID (required)');

  server.registerTool(
    'list-launches',
    {
      description: 'List test launches in a project.',
      inputSchema: z.object({
        projectId: projectIdSchema,
        page: z.number().optional(),
        size: z.number().optional(),
      }),
    },
    withErrorHandler(async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const { projectId: _, ...rest } = params;
      const result = await api.list(projectId, rest);
      return { content: [{ type: 'text' as const, text: formatLaunches(result) }] };
    })
  );

  server.registerTool(
    'get-launch',
    {
      description: 'Get launch details by ID.',
      inputSchema: z.object({
        id: z.number().describe('Launch ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getById(params.id);
      if (!result.statistic || result.statistic.length === 0) {
        const stat = await api.getStatistic(params.id);
        if (stat.length > 0) result.statistic = stat;
      }
      return { content: [{ type: 'text' as const, text: formatLaunch(result) }] };
    })
  );

  server.registerTool(
    'get-launch-test-results',
    {
      description: 'Get test results for a specific launch.',
      inputSchema: z.object({
        id: z.number().describe('Launch ID'),
        page: z.number().optional(),
        size: z.number().optional(),
      }),
    },
    withErrorHandler(async (params) => {
      const { id, ...rest } = params;
      const result = await api.getTestResults(id, rest);
      return { content: [{ type: 'text' as const, text: formatTestResults(result) }] };
    })
  );
}
