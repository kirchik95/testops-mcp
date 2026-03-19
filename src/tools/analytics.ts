import { z } from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AnalyticsApi } from '../api/analytics.js';
import { formatAutomationTrend, formatStatusDistribution, formatSuccessRate } from '../utils/formatting.js';
import { resolveProjectId } from '../config.js';
import { withErrorHandler } from '../utils/error-handler.js';
import { projectIdSchema } from '../utils/schemas.js';

export function registerAnalyticsTools(server: McpServer, api: AnalyticsApi): void {

  server.registerTool(
    'get-automation-trend',
    {
      description: 'Get automation trend chart data for a project.',
      inputSchema: z.object({ projectId: projectIdSchema }),
    },
    withErrorHandler(async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const result = await api.getAutomationTrend(projectId);
      return { content: [{ type: 'text' as const, text: formatAutomationTrend(result) }] };
    })
  );

  server.registerTool(
    'get-status-distribution',
    {
      description: 'Get test case status distribution for a project.',
      inputSchema: z.object({ projectId: projectIdSchema }),
    },
    withErrorHandler(async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const result = await api.getStatusDistribution(projectId);
      return { content: [{ type: 'text' as const, text: formatStatusDistribution(result) }] };
    })
  );

  server.registerTool(
    'get-success-rate',
    {
      description: 'Get test success rate trend for a project.',
      inputSchema: z.object({ projectId: projectIdSchema }),
    },
    withErrorHandler(async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const result = await api.getSuccessRate(projectId);
      return { content: [{ type: 'text' as const, text: formatSuccessRate(result) }] };
    })
  );
}
