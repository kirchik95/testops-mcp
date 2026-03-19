import { describe, it, expect, vi } from 'vitest'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TestPlansApi } from '../api/test-plans.js'
import { registerTestPlanTools } from './test-plans.js'

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
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getTestCases: vi.fn(),
  } as unknown as TestPlansApi
}

describe('registerTestPlanTools', () => {
  it('registers 5 tools in normal mode', () => {
    const server = createMockServer()
    registerTestPlanTools(server, createMockApi())

    expect(server.registerTool).toHaveBeenCalledTimes(5)
    const names = [...(server as any)._tools.keys()]
    expect(names).toEqual([
      'list-test-plans', 'get-test-plan', 'create-test-plan',
      'update-test-plan', 'get-test-plan-test-cases',
    ])
  })

  it('registers only 3 read tools when readOnly=true', () => {
    const server = createMockServer()
    registerTestPlanTools(server, createMockApi(), true)

    expect(server.registerTool).toHaveBeenCalledTimes(3)
    const names = [...(server as any)._tools.keys()]
    expect(names).toEqual(['list-test-plans', 'get-test-plan', 'get-test-plan-test-cases'])
    expect(names).not.toContain('create-test-plan')
    expect(names).not.toContain('update-test-plan')
  })

  describe('list-test-plans handler', () => {
    it('returns formatted test plan list', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestPlanTools(server, api)

      const mockData = {
        content: [{ id: 1, name: 'Sprint 1 Plan', projectId: 42, status: 'Active' }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      }
      vi.mocked(api.list).mockResolvedValue(mockData)

      const handler = (server as any)._tools.get('list-test-plans')!.handler
      const result = await handler({ projectId: 42 }, {})

      expect(api.list).toHaveBeenCalledWith(42, {})
      expect(result.content[0].text).toContain('Sprint 1 Plan')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestPlanTools(server, api)

      vi.mocked(api.list).mockRejectedValue(new Error('Forbidden'))

      const handler = (server as any)._tools.get('list-test-plans')!.handler
      const result = await handler({}, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Forbidden')
    })
  })

  describe('create-test-plan handler', () => {
    it('creates test plan and returns formatted result', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestPlanTools(server, api)

      vi.mocked(api.create).mockResolvedValue({
        id: 5, name: 'New Plan', projectId: 42, status: 'Draft',
      })

      const handler = (server as any)._tools.get('create-test-plan')!.handler
      const result = await handler({ name: 'New Plan', projectId: 42 }, {})

      expect(api.create).toHaveBeenCalledWith({ name: 'New Plan', projectId: 42 })
      expect(result.content[0].text).toContain('Test plan created')
      expect(result.content[0].text).toContain('New Plan')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestPlanTools(server, api)

      vi.mocked(api.create).mockRejectedValue(new Error('Duplicate name'))

      const handler = (server as any)._tools.get('create-test-plan')!.handler
      const result = await handler({ name: 'Dup', projectId: 42 }, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Duplicate name')
    })
  })

  describe('get-test-plan-test-cases handler', () => {
    it('returns formatted test cases for a plan', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestPlanTools(server, api)

      const mockData = {
        content: [{ id: 10, name: 'Login Test', projectId: 42 }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      }
      vi.mocked(api.getTestCases).mockResolvedValue(mockData)

      const handler = (server as any)._tools.get('get-test-plan-test-cases')!.handler
      const result = await handler({ id: 1 }, {})

      expect(api.getTestCases).toHaveBeenCalledWith(1, {})
      expect(result.content[0].text).toContain('Login Test')
    })
  })
})
