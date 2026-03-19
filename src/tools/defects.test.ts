import { describe, it, expect, vi } from 'vitest'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { DefectsApi } from '../api/defects.js'
import { registerDefectTools } from './defects.js'

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
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as DefectsApi
}

describe('registerDefectTools', () => {
  it('registers 4 tools in normal mode', () => {
    const server = createMockServer()
    registerDefectTools(server, createMockApi())

    expect(server.registerTool).toHaveBeenCalledTimes(4)
    const names = [...(server as any)._tools.keys()]
    expect(names).toEqual(['list-defects', 'get-defect', 'create-defect', 'update-defect'])
  })

  it('registers only 2 read tools when readOnly=true', () => {
    const server = createMockServer()
    registerDefectTools(server, createMockApi(), true)

    expect(server.registerTool).toHaveBeenCalledTimes(2)
    const names = [...(server as any)._tools.keys()]
    expect(names).toEqual(['list-defects', 'get-defect'])
    expect(names).not.toContain('create-defect')
    expect(names).not.toContain('update-defect')
  })

  describe('list-defects handler', () => {
    it('returns formatted defect list', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerDefectTools(server, api)

      const mockData = {
        content: [{ id: 1, name: 'Bug 1', projectId: 42, status: 'Open' }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      }
      vi.mocked(api.list).mockResolvedValue(mockData)

      const handler = (server as any)._tools.get('list-defects')!.handler
      const result = await handler({ projectId: 42 }, {})

      expect(api.list).toHaveBeenCalledWith(42, {})
      expect(result.content[0].text).toContain('Bug 1')
    })

    it('uses default projectId from config', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerDefectTools(server, api)

      vi.mocked(api.list).mockResolvedValue({
        content: [], totalElements: 0, totalPages: 0, number: 0, size: 20,
      })

      const handler = (server as any)._tools.get('list-defects')!.handler
      await handler({}, {})

      expect(api.list).toHaveBeenCalledWith(42, {})
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerDefectTools(server, api)

      vi.mocked(api.list).mockRejectedValue(new Error('Server error'))

      const handler = (server as any)._tools.get('list-defects')!.handler
      const result = await handler({}, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Server error')
    })
  })

  describe('create-defect handler', () => {
    it('creates defect and returns formatted result', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerDefectTools(server, api)

      vi.mocked(api.create).mockResolvedValue({
        id: 10, name: 'New Bug', projectId: 42, status: 'Open',
      })

      const handler = (server as any)._tools.get('create-defect')!.handler
      const result = await handler({ name: 'New Bug', projectId: 42 }, {})

      expect(api.create).toHaveBeenCalledWith({ name: 'New Bug', projectId: 42 })
      expect(result.content[0].text).toContain('Defect created')
      expect(result.content[0].text).toContain('New Bug')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerDefectTools(server, api)

      vi.mocked(api.create).mockRejectedValue(new Error('Validation failed'))

      const handler = (server as any)._tools.get('create-defect')!.handler
      const result = await handler({ name: 'Bad', projectId: 42 }, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Validation failed')
    })
  })
})
