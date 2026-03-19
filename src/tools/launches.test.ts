import { describe, it, expect, vi } from 'vitest'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { LaunchesApi } from '../api/launches.js'
import { registerLaunchTools } from './launches.js'

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
    getStatistic: vi.fn(),
    getTestResults: vi.fn(),
  } as unknown as LaunchesApi
}

describe('registerLaunchTools', () => {
  it('registers 3 tools with correct names', () => {
    const server = createMockServer()
    registerLaunchTools(server, createMockApi())

    expect(server.registerTool).toHaveBeenCalledTimes(3)
    const names = [...(server as any)._tools.keys()]
    expect(names).toEqual(['list-launches', 'get-launch', 'get-launch-test-results'])
  })

  describe('list-launches handler', () => {
    it('returns formatted launch list', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerLaunchTools(server, api)

      const mockData = {
        content: [{ id: 1, name: 'CI Run #100', closed: false }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      }
      vi.mocked(api.list).mockResolvedValue(mockData)

      const handler = (server as any)._tools.get('list-launches')!.handler
      const result = await handler({ projectId: 42 }, {})

      expect(api.list).toHaveBeenCalledWith(42, {})
      expect(result.content[0].text).toContain('CI Run #100')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerLaunchTools(server, api)

      vi.mocked(api.list).mockRejectedValue(new Error('Timeout'))

      const handler = (server as any)._tools.get('list-launches')!.handler
      const result = await handler({}, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Timeout')
    })
  })

  describe('get-launch handler', () => {
    it('returns formatted launch with statistic', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerLaunchTools(server, api)

      vi.mocked(api.getById).mockResolvedValue({
        id: 5, name: 'Release Build',
        statistic: [{ status: 'passed', count: 10 }],
      })

      const handler = (server as any)._tools.get('get-launch')!.handler
      const result = await handler({ id: 5 }, {})

      expect(api.getById).toHaveBeenCalledWith(5)
      expect(result.content[0].text).toContain('Release Build')
      expect(api.getStatistic).not.toHaveBeenCalled()
    })

    it('fetches statistic separately when not present', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerLaunchTools(server, api)

      vi.mocked(api.getById).mockResolvedValue({
        id: 5, name: 'Nightly Build', statistic: [],
      })
      vi.mocked(api.getStatistic).mockResolvedValue([
        { status: 'passed', count: 3 },
        { status: 'failed', count: 1 },
      ])

      const handler = (server as any)._tools.get('get-launch')!.handler
      const result = await handler({ id: 5 }, {})

      expect(api.getStatistic).toHaveBeenCalledWith(5)
      expect(result.content[0].text).toContain('Nightly Build')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerLaunchTools(server, api)

      vi.mocked(api.getById).mockRejectedValue(new Error('Not found'))

      const handler = (server as any)._tools.get('get-launch')!.handler
      const result = await handler({ id: 999 }, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Not found')
    })
  })

  describe('get-launch-test-results handler', () => {
    it('returns formatted test results', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerLaunchTools(server, api)

      const mockData = {
        content: [{ id: 1, name: 'Test Login', status: 'passed' as const }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      }
      vi.mocked(api.getTestResults).mockResolvedValue(mockData)

      const handler = (server as any)._tools.get('get-launch-test-results')!.handler
      const result = await handler({ id: 5 }, {})

      expect(api.getTestResults).toHaveBeenCalledWith(5, {})
      expect(result.content[0].text).toContain('Test Login')
    })
  })
})
