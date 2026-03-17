import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TestCasesApi } from '../api/test-cases.js';
import { formatTestCases, formatTestCase, formatScenario } from '../utils/formatting.js';

export function registerTestCaseTools(server: McpServer, api: TestCasesApi): void {
  server.tool(
    'list-test-cases',
    'List test cases in a project. Use list-projects first to get projectId. Supports text search.',
    {
      projectId: z.number().describe('Project ID (required)'),
      search: z.string().optional().describe('Text search query'),
      page: z.number().optional().describe('Page number (0-based)'),
      size: z.number().optional().describe('Page size'),
    },
    async (params) => {
      const { projectId, ...rest } = params;
      const result = await api.list(projectId, rest);
      return { content: [{ type: 'text' as const, text: formatTestCases(result) }] };
    }
  );

  server.tool(
    'search-test-cases',
    `Search test cases using AQL (Allure Query Language). Examples:
- name ~= "login" (name contains)
- tag = "smoke" (by tag)
- automation = true (automated only)
- status = "Active" (by status)
- cf["Epic"] = "Auth" (custom field)
- createdBy = "Ivan" and tag in ["smoke", "regression"] (combinations)`,
    {
      projectId: z.number().describe('Project ID (required)'),
      rql: z.string().describe('AQL filter expression'),
      page: z.number().optional().describe('Page number (0-based)'),
      size: z.number().optional().describe('Page size'),
    },
    async (params) => {
      const { projectId, ...rest } = params;
      const result = await api.search(projectId, rest);
      return { content: [{ type: 'text' as const, text: formatTestCases(result) }] };
    }
  );

  server.tool(
    'get-test-case',
    'Get detailed information about a specific test case by ID.',
    { id: z.number().describe('Test case ID') },
    async (params) => {
      const result = await api.getById(params.id);
      return { content: [{ type: 'text' as const, text: formatTestCase(result) }] };
    }
  );

  server.tool(
    'create-test-case',
    'Create a new test case in a project. Use list-projects first to get projectId.',
    {
      name: z.string().describe('Test case name'),
      projectId: z.number().describe('Project ID'),
      description: z.string().optional().describe('Description'),
      status: z.string().optional().describe('Status: Active, Draft, Deprecated'),
      layer: z.string().optional().describe('Layer: UI, API, Unit'),
      automated: z.boolean().optional().describe('Is automated'),
      tags: z.array(z.object({ name: z.string() })).optional().describe('Tags'),
      precondition: z.string().optional().describe('Precondition'),
      expectedResult: z.string().optional().describe('Expected result'),
    },
    async (params) => {
      const result = await api.create(params);
      return { content: [{ type: 'text' as const, text: `Test case created:\n${formatTestCase(result)}` }] };
    }
  );

  server.tool(
    'update-test-case',
    'Update an existing test case.',
    {
      id: z.number().describe('Test case ID'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      status: z.string().optional().describe('New status'),
      layer: z.string().optional().describe('New layer'),
      automated: z.boolean().optional().describe('Is automated'),
      tags: z.array(z.object({ name: z.string() })).optional().describe('New tags'),
      precondition: z.string().optional().describe('New precondition'),
      expectedResult: z.string().optional().describe('New expected result'),
    },
    async (params) => {
      const { id, ...body } = params;
      const result = await api.update(id, body);
      return { content: [{ type: 'text' as const, text: `Test case updated:\n${formatTestCase(result)}` }] };
    }
  );

  server.tool(
    'delete-test-case',
    'Delete a test case by ID. This action is irreversible.',
    { id: z.number().describe('Test case ID to delete') },
    async (params) => {
      await api.delete(params.id);
      return { content: [{ type: 'text' as const, text: `Test case #${params.id} deleted successfully.` }] };
    }
  );

  server.tool(
    'get-test-case-scenario',
    'Get the scenario (steps) of a test case.',
    { id: z.number().describe('Test case ID') },
    async (params) => {
      const result = await api.getScenario(params.id);
      return { content: [{ type: 'text' as const, text: formatScenario(result) }] };
    }
  );

  const stepSchema: z.ZodType<any> = z.lazy(() =>
    z.object({
      name: z.string().describe('Step description'),
      keyword: z.string().optional().describe('Keyword: Given, When, Then, And'),
      expectedResult: z.string().optional().describe('Expected result'),
      steps: z.array(stepSchema).optional().describe('Nested sub-steps'),
    })
  );

  server.tool(
    'update-test-case-scenario',
    'Update the scenario (steps) of a test case. Replaces all existing steps.',
    {
      id: z.number().describe('Test case ID'),
      steps: z.array(stepSchema).describe('Array of step objects'),
    },
    async (params) => {
      const result = await api.updateScenario(params.id, { steps: params.steps });
      return { content: [{ type: 'text' as const, text: `Scenario updated:\n${formatScenario(result)}` }] };
    }
  );
}
