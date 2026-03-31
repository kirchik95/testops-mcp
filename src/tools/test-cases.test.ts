import { describe, it, expect, vi } from 'vitest'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TestCasesApi } from '../api/test-cases.js'
import { registerTestCaseTools } from './test-cases.js'

const mockConfig = vi.hoisted(() => ({
  testopsUrl: 'https://test.example.com',
  testopsToken: 'test-token',
  projectId: 42,
  pageSize: undefined as number | undefined,
  readOnly: false,
}))

vi.mock('../config.js', () => ({
  config: mockConfig,
  resolveProjectId: (id: number | undefined) => {
    const projectId = id ?? mockConfig.projectId
    if (projectId === undefined) throw new Error('projectId is required')
    return projectId
  },
}))

function createMockServer() {
  const tools = new Map<string, { config: any; handler: (...args: any[]) => any }>()
  return {
    registerTool: vi.fn((name: string, config: any, handler: (...args: any[]) => any) => {
      tools.set(name, { config, handler })
    }),
    _tools: tools,
  } as unknown as McpServer
}

function createMockApi() {
  return {
    list: vi.fn(),
    search: vi.fn(),
    getById: vi.fn(),
    getOverview: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getScenario: vi.fn(),
    getSteps: vi.fn(),
    updateScenario: vi.fn(),
    getIssues: vi.fn(),
    setIssues: vi.fn(),
    getMembers: vi.fn(),
    setMembers: vi.fn(),
    getCustomFields: vi.fn(),
    updateCustomFields: vi.fn(),
    getRelations: vi.fn(),
    setRelations: vi.fn(),
    getRequirements: vi.fn(),
    setRequirements: vi.fn(),
    getTestKeys: vi.fn(),
    setTestKeys: vi.fn(),
  } as unknown as TestCasesApi
}

const READ_TOOL_NAMES = [
  'list-test-cases',
  'search-test-cases',
  'get-test-case',
  'get-test-case-overview',
  'get-test-case-scenario',
  'get-test-case-issues',
  'get-test-case-members',
  'get-test-case-custom-fields',
  'get-test-case-relations',
  'get-test-case-requirements',
  'get-test-case-test-keys',
]

const WRITE_TOOL_NAMES = [
  'create-test-case',
  'update-test-case',
  'delete-test-case',
  'update-test-case-scenario',
  'set-test-case-issues',
  'set-test-case-members',
  'set-test-case-custom-fields',
  'set-test-case-relations',
  'set-test-case-requirements',
  'set-test-case-test-keys',
]

const ALL_TOOL_NAMES = [...READ_TOOL_NAMES, ...WRITE_TOOL_NAMES]
const TOTAL_TOOLS = ALL_TOOL_NAMES.length // 21

describe('registerTestCaseTools', () => {
  it(`registers ${TOTAL_TOOLS} tools in normal mode`, () => {
    const server = createMockServer()
    registerTestCaseTools(server, createMockApi())

    expect(server.registerTool).toHaveBeenCalledTimes(TOTAL_TOOLS)
    const names = [...(server as any)._tools.keys()]
    for (const name of ALL_TOOL_NAMES) {
      expect(names).toContain(name)
    }
  })

  it(`registers only ${READ_TOOL_NAMES.length} read tools when readOnly=true`, () => {
    const server = createMockServer()
    registerTestCaseTools(server, createMockApi(), true)

    expect(server.registerTool).toHaveBeenCalledTimes(READ_TOOL_NAMES.length)
    const names = [...(server as any)._tools.keys()]
    for (const name of READ_TOOL_NAMES) {
      expect(names).toContain(name)
    }
    for (const name of WRITE_TOOL_NAMES) {
      expect(names).not.toContain(name)
    }
  })

  describe('list-test-cases handler', () => {
    it('returns formatted test case list', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestCaseTools(server, api)

      const mockData = {
        content: [{ id: 1, name: 'Login Test', projectId: 42 }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      }
      vi.mocked(api.list).mockResolvedValue(mockData)

      const handler = (server as any)._tools.get('list-test-cases')!.handler
      const result = await handler({ projectId: 42 }, {})

      expect(api.list).toHaveBeenCalledWith(42, {})
      expect(result.content[0].text).toContain('Login Test')
      expect(result.content[0].text).toContain('#1')
    })

    it('passes search param through', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestCaseTools(server, api)

      vi.mocked(api.list).mockResolvedValue({
        content: [], totalElements: 0, totalPages: 0, number: 0, size: 20,
      })

      const handler = (server as any)._tools.get('list-test-cases')!.handler
      await handler({ projectId: 42, search: 'login' }, {})

      expect(api.list).toHaveBeenCalledWith(42, { search: 'login' })
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestCaseTools(server, api)

      vi.mocked(api.list).mockRejectedValue(new Error('Network error'))

      const handler = (server as any)._tools.get('list-test-cases')!.handler
      const result = await handler({}, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Network error')
    })
  })

  describe('create-test-case handler', () => {
    it('creates test case and returns formatted result', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestCaseTools(server, api)

      vi.mocked(api.create).mockResolvedValue({
        id: 100, name: 'New Test', projectId: 42,
      })

      const handler = (server as any)._tools.get('create-test-case')!.handler
      const result = await handler({ name: 'New Test', projectId: 42 }, {})

      expect(api.create).toHaveBeenCalledWith({ name: 'New Test', projectId: 42 })
      expect(result.content[0].text).toContain('Test case created')
      expect(result.content[0].text).toContain('New Test')
    })

    it('uses default projectId from config', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestCaseTools(server, api)

      vi.mocked(api.create).mockResolvedValue({
        id: 101, name: 'Auto Project', projectId: 42,
      })

      const handler = (server as any)._tools.get('create-test-case')!.handler
      await handler({ name: 'Auto Project' }, {})

      expect(api.create).toHaveBeenCalledWith({ name: 'Auto Project', projectId: 42 })
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestCaseTools(server, api)

      vi.mocked(api.create).mockRejectedValue(new Error('Name required'))

      const handler = (server as any)._tools.get('create-test-case')!.handler
      const result = await handler({ name: '', projectId: 42 }, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Name required')
    })
  })

  describe('get-test-case-scenario handler', () => {
    const emptyStepTree = {
      root: { children: [] },
      scenarioSteps: {},
      attachments: {},
      sharedSteps: {},
      sharedStepScenarioSteps: {},
      sharedStepAttachments: {},
    }

    it('returns formatted scenario steps', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestCaseTools(server, api)

      vi.mocked(api.getScenario).mockResolvedValue({
        steps: [
          { name: 'Open login page', keyword: 'Given' },
          { name: 'Enter credentials', keyword: 'When' },
          { name: 'Click submit', keyword: 'Then', expectedResult: 'User is logged in' },
        ],
      })
      vi.mocked(api.getSteps).mockResolvedValue(emptyStepTree)

      const handler = (server as any)._tools.get('get-test-case-scenario')!.handler
      const result = await handler({ id: 1 }, {})

      expect(api.getScenario).toHaveBeenCalledWith(1)
      expect(api.getSteps).toHaveBeenCalledWith(1)
      expect(result.content[0].text).toContain('Open login page')
      expect(result.content[0].text).toContain('Enter credentials')
      expect(result.content[0].text).toContain('Click submit')
      expect(result.content[0].text).toContain('User is logged in')
    })

    it('returns manual steps when scenario is empty', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestCaseTools(server, api)

      vi.mocked(api.getScenario).mockResolvedValue({ steps: [] })
      vi.mocked(api.getSteps).mockResolvedValue({
        ...emptyStepTree,
        root: { children: [100] },
        scenarioSteps: { '100': { id: 100, body: 'Click the login button' } },
      })

      const handler = (server as any)._tools.get('get-test-case-scenario')!.handler
      const result = await handler({ id: 2 }, {})

      expect(result.content[0].text).toContain('Manual steps:')
      expect(result.content[0].text).toContain('Click the login button')
    })

    it('returns no steps when both sources are empty', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestCaseTools(server, api)

      vi.mocked(api.getScenario).mockResolvedValue({ steps: [] })
      vi.mocked(api.getSteps).mockResolvedValue(emptyStepTree)

      const handler = (server as any)._tools.get('get-test-case-scenario')!.handler
      const result = await handler({ id: 3 }, {})

      expect(result.content[0].text).toBe('No steps defined.')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestCaseTools(server, api)

      vi.mocked(api.getScenario).mockRejectedValue(new Error('Not found'))

      const handler = (server as any)._tools.get('get-test-case-scenario')!.handler
      const result = await handler({ id: 999 }, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Not found')
    })
  })

  describe('delete-test-case handler', () => {
    it('deletes test case and returns success message', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestCaseTools(server, api)

      vi.mocked(api.delete).mockResolvedValue(undefined)

      const handler = (server as any)._tools.get('delete-test-case')!.handler
      const result = await handler({ id: 55 }, {})

      expect(api.delete).toHaveBeenCalledWith(55)
      expect(result.content[0].text).toContain('#55')
      expect(result.content[0].text).toContain('deleted')
    })
  })

  describe('update-test-case handler', () => {
    it('updates test case and returns formatted result', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestCaseTools(server, api)

      vi.mocked(api.update).mockResolvedValue({
        id: 10, name: 'Updated Test', projectId: 42,
      })

      const handler = (server as any)._tools.get('update-test-case')!.handler
      const result = await handler({ id: 10, name: 'Updated Test' }, {})

      expect(api.update).toHaveBeenCalledWith(10, { name: 'Updated Test' })
      expect(result.content[0].text).toContain('Test case updated')
      expect(result.content[0].text).toContain('Updated Test')
    })
  })
})
