import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AnalyticsApi } from '../api/analytics.js';
import { formatAutomationTrend, formatStatusDistribution, formatSuccessRate } from '../utils/formatting.js';

export function registerAnalyticsTools(server: McpServer, api: AnalyticsApi): void {
  server.tool(
    'get-automation-trend',
    'Get automation trend chart data for a project.',
    { projectId: z.number().describe('Project ID') },
    async (params) => {
      const result = await api.getAutomationTrend(params.projectId);
      return { content: [{ type: 'text' as const, text: formatAutomationTrend(result) }] };
    }
  );

  server.tool(
    'get-status-distribution',
    'Get test case status distribution for a project.',
    { projectId: z.number().describe('Project ID') },
    async (params) => {
      const result = await api.getStatusDistribution(params.projectId);
      return { content: [{ type: 'text' as const, text: formatStatusDistribution(result) }] };
    }
  );

  server.tool(
    'get-success-rate',
    'Get test success rate trend for a project.',
    { projectId: z.number().describe('Project ID') },
    async (params) => {
      const result = await api.getSuccessRate(params.projectId);
      return { content: [{ type: 'text' as const, text: formatSuccessRate(result) }] };
    }
  );
}
