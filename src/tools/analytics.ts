import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AnalyticsApi } from '../api/analytics.js';
import { formatAutomationTrend, formatStatusDistribution, formatSuccessRate } from '../utils/formatting.js';
import { config, resolveProjectId } from '../config.js';

export function registerAnalyticsTools(server: McpServer, api: AnalyticsApi): void {
  const projectIdSchema = config.projectId
    ? z.number().optional().describe('Project ID (optional if TESTOPS_PROJECT_ID is set)')
    : z.number().describe('Project ID (required)');

  server.tool(
    'get-automation-trend',
    'Get automation trend chart data for a project.',
    { projectId: projectIdSchema },
    async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const result = await api.getAutomationTrend(projectId);
      return { content: [{ type: 'text' as const, text: formatAutomationTrend(result) }] };
    }
  );

  server.tool(
    'get-status-distribution',
    'Get test case status distribution for a project.',
    { projectId: projectIdSchema },
    async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const result = await api.getStatusDistribution(projectId);
      return { content: [{ type: 'text' as const, text: formatStatusDistribution(result) }] };
    }
  );

  server.tool(
    'get-success-rate',
    'Get test success rate trend for a project.',
    { projectId: projectIdSchema },
    async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const result = await api.getSuccessRate(projectId);
      return { content: [{ type: 'text' as const, text: formatSuccessRate(result) }] };
    }
  );
}
