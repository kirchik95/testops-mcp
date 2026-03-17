import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ProjectsApi } from '../api/projects.js';
import { formatProjects, formatProject } from '../utils/formatting.js';

export function registerProjectTools(server: McpServer, api: ProjectsApi): void {
  server.tool(
    'list-projects',
    'List all projects in TestOps. Returns project IDs needed for other operations.',
    { page: z.number().optional().describe('Page number (0-based)'), size: z.number().optional().describe('Page size (default 20)') },
    async (params) => {
      const result = await api.list(params);
      return { content: [{ type: 'text' as const, text: formatProjects(result) }] };
    }
  );

  server.tool(
    'get-project',
    'Get project details by ID.',
    { id: z.number().describe('Project ID') },
    async (params) => {
      const result = await api.getById(params.id);
      return { content: [{ type: 'text' as const, text: formatProject(result) }] };
    }
  );
}
