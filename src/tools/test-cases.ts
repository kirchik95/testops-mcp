import { z } from 'zod/v4';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TestCasesApi } from '../api/test-cases.js';
import {
  formatTestCases, formatTestCase, formatTestCaseOverview, formatScenario,
  formatIssues, formatMembers, formatCustomFields, formatRelations,
  formatRequirements, formatTestKeys,
} from '../utils/formatting.js';
import { resolveProjectId } from '../config.js';
import { withErrorHandler } from '../utils/error-handler.js';
import { projectIdSchema } from '../utils/schemas.js';

export function registerTestCaseTools(server: McpServer, api: TestCasesApi, readOnly = false): void {

  // --- Core CRUD ---

  server.registerTool(
    'list-test-cases',
    {
      description: 'List test cases in a project. Use list-projects first to get projectId. Supports text search.',
      inputSchema: z.object({
        projectId: projectIdSchema,
        search: z.string().optional().describe('Text search query'),
        page: z.number().optional().describe('Page number (0-based)'),
        size: z.number().optional().describe('Page size'),
      }),
    },
    withErrorHandler(async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const { projectId: _, ...rest } = params;
      const result = await api.list(projectId, rest);
      return { content: [{ type: 'text' as const, text: formatTestCases(result) }] };
    })
  );

  server.registerTool(
    'search-test-cases',
    {
      description: `Search test cases using AQL (Allure Query Language). Examples:
- name ~= "login" (name contains)
- tag = "smoke" (by tag)
- automation = true (automated only)
- status = "Active" (by status)
- cf["Epic"] = "Auth" (custom field)
- createdBy = "Ivan" and tag in ["smoke", "regression"] (combinations)`,
      inputSchema: z.object({
        projectId: projectIdSchema,
        rql: z.string().describe('AQL filter expression'),
        page: z.number().optional().describe('Page number (0-based)'),
        size: z.number().optional().describe('Page size'),
      }),
    },
    withErrorHandler(async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const { projectId: _, ...rest } = params;
      const result = await api.search(projectId, rest);
      return { content: [{ type: 'text' as const, text: formatTestCases(result) }] };
    })
  );

  server.registerTool(
    'get-test-case',
    {
      description: 'Get basic information about a test case. For full details including members, issues, custom fields, relations, requirements, and test keys — use get-test-case-overview instead.',
      inputSchema: z.object({
        id: z.number().describe('Test case ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getById(params.id);
      return { content: [{ type: 'text' as const, text: formatTestCase(result) }] };
    })
  );

  server.registerTool(
    'get-test-case-overview',
    {
      description: 'Get FULL test case information including members, issue links, custom fields, requirements, and test keys. Use this when you need complete test case details.',
      inputSchema: z.object({
        id: z.number().describe('Test case ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getOverview(params.id);
      return { content: [{ type: 'text' as const, text: formatTestCaseOverview(result) }] };
    })
  );

  if (!readOnly) {
    const externalLinkSchema = z.object({
      name: z.string().optional().describe('Link display name'),
      url: z.string().describe('Link URL'),
      type: z.string().optional().describe('Link type'),
    });

    const memberSchema = z.object({
      id: z.number().describe('User ID'),
      role: z.object({
        id: z.number().describe('Role ID'),
      }).optional().describe('Role'),
    });

    server.registerTool(
      'create-test-case',
      {
        description: 'Create a new test case. Supports setting name, description, tags, links, and members. For custom fields, issues, relations, requirements, and test keys — create the test case first, then use dedicated set-* tools.',
        inputSchema: z.object({
          name: z.string().describe('Test case name'),
          projectId: projectIdSchema,
          description: z.string().optional().describe('Description'),
          statusId: z.number().optional().describe('Status ID (get from workflow). Common: Active, Draft, Deprecated'),
          testLayerId: z.number().optional().describe('Test layer ID. Common layers: UI, API, Unit'),
          automated: z.boolean().optional().describe('Is automated'),
          tags: z.array(z.object({ name: z.string() })).optional().describe('Tags'),
          precondition: z.string().optional().describe('Precondition'),
          expectedResult: z.string().optional().describe('Expected result'),
          fullName: z.string().optional().describe('Full name (e.g. class path)'),
          links: z.array(externalLinkSchema).optional().describe('External links'),
          members: z.array(memberSchema).optional().describe('Members with roles (user IDs and role IDs)'),
        }),
      },
      withErrorHandler(async (params) => {
        const projectId = resolveProjectId(params.projectId);
        const { projectId: _, ...rest } = params;
        const result = await api.create({ ...rest, projectId });
        return { content: [{ type: 'text' as const, text: `Test case created:\n${formatTestCase(result)}` }] };
      })
    );

    server.registerTool(
      'update-test-case',
      {
        description: 'Update an existing test case. Supports updating name, description, tags, links, and members. For custom fields, issues, relations, requirements, and test keys — use dedicated set-* tools.',
        inputSchema: z.object({
          id: z.number().describe('Test case ID'),
          name: z.string().optional().describe('New name'),
          description: z.string().optional().describe('New description'),
          statusId: z.number().optional().describe('New status ID'),
          testLayerId: z.number().optional().describe('New test layer ID'),
          automated: z.boolean().optional().describe('Is automated'),
          tags: z.array(z.object({ name: z.string() })).optional().describe('New tags (replaces all)'),
          precondition: z.string().optional().describe('New precondition'),
          expectedResult: z.string().optional().describe('New expected result'),
          fullName: z.string().optional().describe('Full name'),
          links: z.array(externalLinkSchema).optional().describe('External links (replaces all)'),
          members: z.array(memberSchema).optional().describe('Members with roles (replaces all)'),
          duration: z.number().optional().describe('Estimated duration in ms'),
        }),
      },
      withErrorHandler(async (params) => {
        const { id, ...body } = params;
        const result = await api.update(id, body);
        return { content: [{ type: 'text' as const, text: `Test case updated:\n${formatTestCase(result)}` }] };
      })
    );

    server.registerTool(
      'delete-test-case',
      {
        description: 'Delete a test case by ID. This action is irreversible.',
        inputSchema: z.object({
          id: z.number().describe('Test case ID to delete'),
        }),
      },
      withErrorHandler(async (params) => {
        await api.delete(params.id);
        return { content: [{ type: 'text' as const, text: `Test case #${params.id} deleted successfully.` }] };
      })
    );
  }

  // --- Scenario (steps) ---

  server.registerTool(
    'get-test-case-scenario',
    {
      description: 'Get the scenario (steps) of a test case.',
      inputSchema: z.object({
        id: z.number().describe('Test case ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getScenario(params.id);
      return { content: [{ type: 'text' as const, text: formatScenario(result) }] };
    })
  );

  if (!readOnly) {
    const stepSchema: z.ZodType<any> = z.lazy(() =>
      z.object({
        name: z.string().describe('Step description'),
        keyword: z.string().optional().describe('Keyword: Given, When, Then, And'),
        expectedResult: z.string().optional().describe('Expected result'),
        steps: z.array(stepSchema).optional().describe('Nested sub-steps'),
      })
    );

    server.registerTool(
      'update-test-case-scenario',
      {
        description: 'Update the scenario (steps) of a test case. Replaces all existing steps.',
        inputSchema: z.object({
          id: z.number().describe('Test case ID'),
          steps: z.array(stepSchema).describe('Array of step objects'),
        }),
      },
      withErrorHandler(async (params) => {
        const result = await api.updateScenario(params.id, { steps: params.steps });
        return { content: [{ type: 'text' as const, text: `Scenario updated:\n${formatScenario(result)}` }] };
      })
    );
  }

  // --- Issue Links ---

  server.registerTool(
    'get-test-case-issues',
    {
      description: 'Get issue links for a test case (e.g. Jira issues).',
      inputSchema: z.object({
        id: z.number().describe('Test case ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getIssues(params.id);
      return { content: [{ type: 'text' as const, text: formatIssues(result) }] };
    })
  );

  if (!readOnly) {
    server.registerTool(
      'set-test-case-issues',
      {
        description: 'Set issue links for a test case (replaces all existing). Use to link Jira/YouTrack/etc issues.',
        inputSchema: z.object({
          id: z.number().describe('Test case ID'),
          issues: z.array(z.object({
            name: z.string().describe('Issue key (e.g. DEV-33677)'),
            url: z.string().optional().describe('Issue URL'),
          })).describe('Issue links to set'),
        }),
      },
      withErrorHandler(async (params) => {
        const result = await api.setIssues(params.id, params.issues);
        return { content: [{ type: 'text' as const, text: `Issue links updated:\n${formatIssues(result)}` }] };
      })
    );
  }

  // --- Members ---

  server.registerTool(
    'get-test-case-members',
    {
      description: 'Get members (owner, reviewers, etc.) for a test case.',
      inputSchema: z.object({
        id: z.number().describe('Test case ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getMembers(params.id);
      return { content: [{ type: 'text' as const, text: formatMembers(result) }] };
    })
  );

  if (!readOnly) {
    server.registerTool(
      'set-test-case-members',
      {
        description: 'Set members for a test case (replaces all existing). Each member needs a user ID and role ID.',
        inputSchema: z.object({
          id: z.number().describe('Test case ID'),
          members: z.array(z.object({
            id: z.number().describe('User ID'),
            role: z.object({
              id: z.number().describe('Role ID'),
            }).describe('Role'),
          })).describe('Members to set'),
        }),
      },
      withErrorHandler(async (params) => {
        const result = await api.setMembers(params.id, params.members);
        return { content: [{ type: 'text' as const, text: `Members updated:\n${formatMembers(result)}` }] };
      })
    );
  }

  // --- Custom Fields ---

  server.registerTool(
    'get-test-case-custom-fields',
    {
      description: 'Get custom field values for a test case (e.g. Component, Priority, Team, Section).',
      inputSchema: z.object({
        id: z.number().describe('Test case ID'),
        projectId: projectIdSchema,
      }),
    },
    withErrorHandler(async (params) => {
      const projectId = resolveProjectId(params.projectId);
      const result = await api.getCustomFields(params.id, projectId);
      return { content: [{ type: 'text' as const, text: formatCustomFields(result) }] };
    })
  );

  if (!readOnly) {
    server.registerTool(
      'set-test-case-custom-fields',
      {
        description: 'Update custom field values for a test case. First use get-test-case-custom-fields to see available fields and their IDs. Automatically merges with existing values — only the specified fields are replaced, others are preserved.',
        inputSchema: z.object({
          id: z.number().describe('Test case ID'),
          projectId: projectIdSchema,
          fields: z.array(z.object({
            customField: z.object({
              id: z.number().describe('Custom field ID'),
            }).describe('Custom field reference'),
            id: z.number().describe('Custom field value ID'),
            name: z.string().optional().default('').describe('Value name (optional)'),
          })).describe('Custom field values to set (flat format: customField.id + value id)'),
        }),
      },
      withErrorHandler(async (params) => {
        const projectId = resolveProjectId(params.projectId);
        await api.updateCustomFields(params.id, projectId, params.fields);
        return { content: [{ type: 'text' as const, text: `Custom fields updated for test case #${params.id}.` }] };
      })
    );
  }

  // --- Relations ---

  server.registerTool(
    'get-test-case-relations',
    {
      description: 'Get relations for a test case (related to, clones, duplicates, etc.).',
      inputSchema: z.object({
        id: z.number().describe('Test case ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getRelations(params.id);
      return { content: [{ type: 'text' as const, text: formatRelations(result) }] };
    })
  );

  if (!readOnly) {
    server.registerTool(
      'set-test-case-relations',
      {
        description: 'Set relations for a test case (replaces all existing). Types: "related to", "clones", "is cloned by", "duplicates", "is duplicated by", "automates", "is automated by".',
        inputSchema: z.object({
          id: z.number().describe('Test case ID'),
          relations: z.array(z.object({
            target: z.object({
              id: z.number().describe('Target test case ID'),
            }).describe('Target test case'),
            type: z.enum([
              'related to', 'clones', 'is cloned by',
              'duplicates', 'is duplicated by',
              'automates', 'is automated by',
            ]).describe('Relation type'),
          })).describe('Relations to set'),
        }),
      },
      withErrorHandler(async (params) => {
        const result = await api.setRelations(params.id, params.relations);
        return { content: [{ type: 'text' as const, text: `Relations updated:\n${formatRelations(result)}` }] };
      })
    );
  }

  // --- Requirements ---

  server.registerTool(
    'get-test-case-requirements',
    {
      description: 'Get requirements linked to a test case.',
      inputSchema: z.object({
        id: z.number().describe('Test case ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getRequirements(params.id);
      return { content: [{ type: 'text' as const, text: formatRequirements(result) }] };
    })
  );

  if (!readOnly) {
    server.registerTool(
      'set-test-case-requirements',
      {
        description: 'Set requirements for a test case (replaces all existing).',
        inputSchema: z.object({
          id: z.number().describe('Test case ID'),
          requirements: z.array(z.object({
            name: z.string().describe('Requirement key/name'),
            url: z.string().optional().describe('Requirement URL'),
            integrationId: z.number().optional().describe('Integration ID'),
          })).describe('Requirements to set'),
        }),
      },
      withErrorHandler(async (params) => {
        const result = await api.setRequirements(params.id, params.requirements);
        return { content: [{ type: 'text' as const, text: `Requirements updated:\n${formatRequirements(result)}` }] };
      })
    );
  }

  // --- Test Keys ---

  server.registerTool(
    'get-test-case-test-keys',
    {
      description: 'Get test keys for a test case.',
      inputSchema: z.object({
        id: z.number().describe('Test case ID'),
      }),
    },
    withErrorHandler(async (params) => {
      const result = await api.getTestKeys(params.id);
      return { content: [{ type: 'text' as const, text: formatTestKeys(result) }] };
    })
  );

  if (!readOnly) {
    server.registerTool(
      'set-test-case-test-keys',
      {
        description: 'Set test keys for a test case (replaces all existing).',
        inputSchema: z.object({
          id: z.number().describe('Test case ID'),
          testKeys: z.array(z.object({
            name: z.string().describe('Test key value'),
            integrationId: z.number().optional().describe('Integration ID'),
          })).describe('Test keys to set'),
        }),
      },
      withErrorHandler(async (params) => {
        const result = await api.setTestKeys(params.id, params.testKeys);
        return { content: [{ type: 'text' as const, text: `Test keys updated:\n${formatTestKeys(result)}` }] };
      })
    );
  }
}
