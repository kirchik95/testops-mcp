import { describe, it, expect, vi } from 'vitest'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ProjectsApi } from '../api/projects.js'
import { registerProjectTools } from './projects.js'

function createMockServer() {
  const tools = new Map<string, { config: any; handler: Function }>()
  return {
    registerTool: vi.fn((name: string, config: any, handler: Function) => {
      tools.set(name, { config, handler })
    }),
    _tools: tools,
  } as unknown as McpServer
}

function createMockApi() {
  return {
    list: vi.fn(),
    getById: vi.fn(),
  } as unknown as ProjectsApi
}

describe('registerProjectTools', () => {
  it('registers 2 tools with correct names', () => {
    const server = createMockServer()
    const api = createMockApi()
    registerProjectTools(server, api)

    expect(server.registerTool).toHaveBeenCalledTimes(2)
    const names = [...(server as any)._tools.keys()]
    expect(names).toContain('list-projects')
    expect(names).toContain('get-project')
  })

  describe('list-projects handler', () => {
    it('returns formatted project list', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerProjectTools(server, api)

      const mockData = {
        content: [{ id: 1, name: 'Project A', isPublic: true }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      }
      vi.mocked(api.list).mockResolvedValue(mockData)

      const handler = (server as any)._tools.get('list-projects')!.handler
      const result = await handler({ page: 0, size: 20 }, {})

      expect(api.list).toHaveBeenCalledWith({ page: 0, size: 20 })
      expect(result.content[0].text).toContain('Project A')
      expect(result.content[0].text).toContain('#1')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerProjectTools(server, api)

      vi.mocked(api.list).mockRejectedValue(new Error('Network error'))

      const handler = (server as any)._tools.get('list-projects')!.handler
      const result = await handler({}, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Network error')
    })
  })

  describe('get-project handler', () => {
    it('returns formatted project details', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerProjectTools(server, api)

      vi.mocked(api.getById).mockResolvedValue({ id: 5, name: 'My Project', isPublic: false })

      const handler = (server as any)._tools.get('get-project')!.handler
      const result = await handler({ id: 5 }, {})

      expect(api.getById).toHaveBeenCalledWith(5)
      expect(result.content[0].text).toContain('My Project')
      expect(result.content[0].text).toContain('#5')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerProjectTools(server, api)

      vi.mocked(api.getById).mockRejectedValue(new Error('Not found'))

      const handler = (server as any)._tools.get('get-project')!.handler
      const result = await handler({ id: 999 }, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Not found')
    })
  })
})
