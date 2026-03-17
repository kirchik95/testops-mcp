import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DefectsApi } from '../api/defects.js';
import { formatDefects, formatDefect } from '../utils/formatting.js';
import { config, resolveProjectId } from '../config.js';

export function registerDefectTools(server: McpServer, api: DefectsApi, readOnly = false): void {
  const projectIdSchema = config.projectId
    ? z.number().optional().describe('Project ID (optional if TESTOPS_PROJECT_ID is set)')
    : z.number().describe('Project ID (required)');

  server.tool(
    'list-defects',
    'List defects in a project.',
    {
      projectId: projectIdSchema,
      page: z.number().optional(),
      size: z.number().optional(),
    },
    async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const { projectId: _, ...rest } = params;
      const result = await api.list(projectId, rest);
      return { content: [{ type: 'text' as const, text: formatDefects(result) }] };
    }
  );

  server.tool(
    'get-defect',
    'Get defect details by ID.',
    { id: z.number().describe('Defect ID') },
    async (params) => {
      const result = await api.getById(params.id);
      return { content: [{ type: 'text' as const, text: formatDefect(result) }] };
    }
  );

  if (!readOnly) {
    server.tool(
      'create-defect',
      'Create a new defect in a project.',
      {
        name: z.string().describe('Defect name'),
        projectId: projectIdSchema,
        description: z.string().optional().describe('Description'),
      },
      async (params) => {
        const projectId = resolveProjectId(params.projectId);
        const { projectId: _, ...rest } = params;
        const result = await api.create({ ...rest, projectId });
        return { content: [{ type: 'text' as const, text: `Defect created:\n${formatDefect(result)}` }] };
      }
    );

    server.tool(
      'update-defect',
      'Update an existing defect.',
      {
        id: z.number().describe('Defect ID'),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
      },
      async (params) => {
        const { id, ...body } = params;
        const result = await api.update(id, body);
        return { content: [{ type: 'text' as const, text: `Defect updated:\n${formatDefect(result)}` }] };
      }
    );
  }
}
