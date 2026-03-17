import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { LaunchesApi } from '../api/launches.js';
import { formatLaunches, formatLaunch, formatTestResults } from '../utils/formatting.js';
import { config, resolveProjectId } from '../config.js';

export function registerLaunchTools(server: McpServer, api: LaunchesApi): void {
  const projectIdSchema = config.projectId
    ? z.number().optional().describe('Project ID (optional if TESTOPS_PROJECT_ID is set)')
    : z.number().describe('Project ID (required)');

  server.tool(
    'list-launches',
    'List test launches in a project.',
    {
      projectId: projectIdSchema,
      page: z.number().optional(),
      size: z.number().optional(),
    },
    async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const { projectId: _, ...rest } = params;
      const result = await api.list(projectId, rest);
      return { content: [{ type: 'text' as const, text: formatLaunches(result) }] };
    }
  );

  server.tool(
    'get-launch',
    'Get launch details by ID.',
    { id: z.number().describe('Launch ID') },
    async (params) => {
      const result = await api.getById(params.id);
      if (!result.statistic) {
        result.statistic = await api.getStatistic(params.id) ?? undefined;
      }
      return { content: [{ type: 'text' as const, text: formatLaunch(result) }] };
    }
  );

  server.tool(
    'get-launch-test-results',
    'Get test results for a specific launch.',
    {
      id: z.number().describe('Launch ID'),
      page: z.number().optional(),
      size: z.number().optional(),
    },
    async (params) => {
      const { id, ...rest } = params;
      const result = await api.getTestResults(id, rest);
      return { content: [{ type: 'text' as const, text: formatTestResults(result) }] };
    }
  );
}
