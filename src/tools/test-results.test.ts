import { describe, it, expect, vi } from 'vitest'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TestResultsApi } from '../api/test-results.js'
import { registerTestResultTools } from './test-results.js'

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
    update: vi.fn(),
  } as unknown as TestResultsApi
}

describe('registerTestResultTools', () => {
  it('registers 3 tools in normal mode', () => {
    const server = createMockServer()
    registerTestResultTools(server, createMockApi())

    expect(server.registerTool).toHaveBeenCalledTimes(3)
    const names = [...(server as any)._tools.keys()]
    expect(names).toEqual(['list-test-results', 'get-test-result', 'update-test-result'])
  })

  it('registers only 2 read tools when readOnly=true', () => {
    const server = createMockServer()
    registerTestResultTools(server, createMockApi(), true)

    expect(server.registerTool).toHaveBeenCalledTimes(2)
    const names = [...(server as any)._tools.keys()]
    expect(names).toEqual(['list-test-results', 'get-test-result'])
    expect(names).not.toContain('update-test-result')
  })

  describe('list-test-results handler', () => {
    it('returns formatted results list', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestResultTools(server, api)

      const mockData = {
        content: [{ id: 1, name: 'Login Test', status: 'passed' as const }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      }
      vi.mocked(api.list).mockResolvedValue(mockData)

      const handler = (server as any)._tools.get('list-test-results')!.handler
      const result = await handler({ projectId: 42, launchId: 1 }, {})

      expect(api.list).toHaveBeenCalledWith(42, { launchId: 1 })
      expect(result.content[0].text).toContain('Login Test')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestResultTools(server, api)

      vi.mocked(api.list).mockRejectedValue(new Error('Unauthorized'))

      const handler = (server as any)._tools.get('list-test-results')!.handler
      const result = await handler({ launchId: 1 }, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Unauthorized')
    })
  })

  describe('get-test-result handler', () => {
    it('returns formatted test result', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestResultTools(server, api)

      vi.mocked(api.getById).mockResolvedValue({
        id: 7, name: 'Checkout Flow', status: 'failed',
      })

      const handler = (server as any)._tools.get('get-test-result')!.handler
      const result = await handler({ id: 7 }, {})

      expect(api.getById).toHaveBeenCalledWith(7)
      expect(result.content[0].text).toContain('Checkout Flow')
      expect(result.content[0].text).toContain('failed')
    })
  })

  describe('update-test-result handler', () => {
    it('updates and returns formatted result', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestResultTools(server, api)

      vi.mocked(api.update).mockResolvedValue({
        id: 7, name: 'Checkout Flow', status: 'passed',
      })

      const handler = (server as any)._tools.get('update-test-result')!.handler
      const result = await handler({ id: 7, status: 'passed' }, {})

      expect(api.update).toHaveBeenCalledWith(7, { status: 'passed' })
      expect(result.content[0].text).toContain('Test result updated')
      expect(result.content[0].text).toContain('Checkout Flow')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerTestResultTools(server, api)

      vi.mocked(api.update).mockRejectedValue(new Error('Invalid status'))

      const handler = (server as any)._tools.get('update-test-result')!.handler
      const result = await handler({ id: 7, status: 'invalid' }, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Invalid status')
    })
  })
})
