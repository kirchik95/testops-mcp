import { z } from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ProjectsApi } from '../api/projects.js';
import { formatProjects, formatProject } from '../utils/formatting.js';
import { withErrorHandler } from '../utils/error-handler.js';

export function registerProjectTools(server: McpServer, api: ProjectsApi): void {
  server.registerTool(
    'list-projects',
    {
      description: 'List all projects in TestOps. Returns project IDs needed for other operations.',
      inputSchema: z.object({
        page: z.number().optional().describe('Page number (0-based)'),
        size: z.number().optional().describe('Page size (default 20)'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.list(params);
      return { content: [{ type: 'text' as const, text: formatProjects(result) }] };
    })
  );

  server.registerTool(
    'get-project',
    {
      description: 'Get project details by ID.',
      inputSchema: z.object({
        id: z.number().describe('Project ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getById(params.id);
      return { content: [{ type: 'text' as const, text: formatProject(result) }] };
    })
  );
}
