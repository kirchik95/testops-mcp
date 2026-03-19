import { z } from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TestPlansApi } from '../api/test-plans.js';
import { formatTestPlans, formatTestPlan, formatTestCases } from '../utils/formatting.js';
import { config, resolveProjectId } from '../config.js';
import { withErrorHandler } from '../utils/error-handler.js';

export function registerTestPlanTools(server: McpServer, api: TestPlansApi, readOnly = false): void {
  const projectIdSchema = config.projectId
    ? z.number().optional().describe('Project ID (optional if TESTOPS_PROJECT_ID is set)')
    : z.number().describe('Project ID (required)');

  server.registerTool(
    'list-test-plans',
    {
      description: 'List test plans in a project. Use list-projects first to get projectId.',
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
      return { content: [{ type: 'text' as const, text: formatTestPlans(result) }] };
    })
  );

  server.registerTool(
    'get-test-plan',
    {
      description: 'Get test plan details by ID.',
      inputSchema: z.object({
        id: z.number().describe('Test plan ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getById(params.id);
      return { content: [{ type: 'text' as const, text: formatTestPlan(result) }] };
    })
  );

  if (!readOnly) {
    server.registerTool(
      'create-test-plan',
      {
        description: 'Create a new test plan in a project.',
        inputSchema: z.object({
          name: z.string().describe('Test plan name'),
          projectId: projectIdSchema,
          description: z.string().optional().describe('Description'),
        }),
      },
      withErrorHandler(async (params) => {
        const projectId = resolveProjectId(params.projectId);
        const { projectId: _, ...rest } = params;
        const result = await api.create({ ...rest, projectId });
        return { content: [{ type: 'text' as const, text: `Test plan created:\n${formatTestPlan(result)}` }] };
      })
    );

    server.registerTool(
      'update-test-plan',
      {
        description: 'Update an existing test plan.',
        inputSchema: z.object({
          id: z.number().describe('Test plan ID'),
          name: z.string().optional(),
          description: z.string().optional(),
          status: z.string().optional(),
        }),
      },
      withErrorHandler(async (params) => {
        const { id, ...body } = params;
        const result = await api.update(id, body);
        return { content: [{ type: 'text' as const, text: `Test plan updated:\n${formatTestPlan(result)}` }] };
      })
    );
  }

  server.registerTool(
    'get-test-plan-test-cases',
    {
      description: 'Get test cases included in a test plan.',
      inputSchema: z.object({
        id: z.number().describe('Test plan ID'),
        page: z.number().optional(),
        size: z.number().optional(),
      }),
    },
    withErrorHandler(async (params) => {
      const { id, ...rest } = params;
      const result = await api.getTestCases(id, rest);
      return { content: [{ type: 'text' as const, text: formatTestCases(result) }] };
    })
  );
}
