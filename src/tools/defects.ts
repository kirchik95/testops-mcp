import { z } from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DefectsApi } from '../api/defects.js';
import { formatDefects, formatDefect } from '../utils/formatting.js';
import { resolveProjectId } from '../config.js';
import { withErrorHandler } from '../utils/error-handler.js';
import { projectIdSchema } from '../utils/schemas.js';

export function registerDefectTools(server: McpServer, api: DefectsApi, readOnly = false): void {

  server.registerTool(
    'list-defects',
    {
      description: 'List defects in a project.',
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
      return { content: [{ type: 'text' as const, text: formatDefects(result) }] };
    })
  );

  server.registerTool(
    'get-defect',
    {
      description: 'Get defect details by ID.',
      inputSchema: z.object({
        id: z.number().describe('Defect ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getById(params.id);
      return { content: [{ type: 'text' as const, text: formatDefect(result) }] };
    })
  );

  if (!readOnly) {
    server.registerTool(
      'create-defect',
      {
        description: 'Create a new defect in a project.',
        inputSchema: z.object({
          name: z.string().describe('Defect name'),
          projectId: projectIdSchema,
          description: z.string().optional().describe('Description'),
        }),
      },
      withErrorHandler(async (params) => {
        const projectId = resolveProjectId(params.projectId);
        const { projectId: _, ...rest } = params;
        const result = await api.create({ ...rest, projectId });
        return { content: [{ type: 'text' as const, text: `Defect created:\n${formatDefect(result)}` }] };
      })
    );

    server.registerTool(
      'update-defect',
      {
        description: 'Update an existing defect.',
        inputSchema: z.object({
          id: z.number().describe('Defect ID'),
          name: z.string().optional(),
          description: z.string().optional(),
          status: z.string().optional(),
        }),
      },
      withErrorHandler(async (params) => {
        const { id, ...body } = params;
        const result = await api.update(id, body);
        return { content: [{ type: 'text' as const, text: `Defect updated:\n${formatDefect(result)}` }] };
      })
    );
  }
}
