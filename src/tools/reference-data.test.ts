import { describe, it, expect, vi } from 'vitest'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ReferenceDataApi } from '../api/reference-data.js'
import { registerReferenceDataTools } from './reference-data.js'

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
    listTestLayers: vi.fn(),
    listWorkflows: vi.fn(),
  } as unknown as ReferenceDataApi
}

describe('registerReferenceDataTools', () => {
  it('registers 2 tools with correct names', () => {
    const server = createMockServer()
    registerReferenceDataTools(server, createMockApi())

    expect(server.registerTool).toHaveBeenCalledTimes(2)
    const names = [...(server as any)._tools.keys()]
    expect(names).toEqual(['list-test-layers', 'list-workflows'])
  })

  describe('list-test-layers handler', () => {
    it('returns formatted test layers', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerReferenceDataTools(server, api)

      const mockData = {
        content: [
          { id: 1, name: 'UI' },
          { id: 2, name: 'API' },
        ],
        totalElements: 2,
        totalPages: 1,
        number: 0,
        size: 20,
      }
      vi.mocked(api.listTestLayers).mockResolvedValue(mockData)

      const handler = (server as any)._tools.get('list-test-layers')!.handler
      const result = await handler({}, {})

      expect(api.listTestLayers).toHaveBeenCalledWith({})
      expect(result.content[0].text).toContain('UI')
      expect(result.content[0].text).toContain('API')
      expect(result.content[0].text).toContain('2 test layer(s)')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerReferenceDataTools(server, api)

      vi.mocked(api.listTestLayers).mockRejectedValue(new Error('Connection refused'))

      const handler = (server as any)._tools.get('list-test-layers')!.handler
      const result = await handler({}, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Connection refused')
    })
  })

  describe('list-workflows handler', () => {
    it('returns formatted workflows', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerReferenceDataTools(server, api)

      const mockData = {
        content: [{
          id: 1,
          name: 'Default Workflow',
          statuses: [
            { id: 10, name: 'Active' },
            { id: 20, name: 'Draft' },
          ],
        }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      }
      vi.mocked(api.listWorkflows).mockResolvedValue(mockData)

      const handler = (server as any)._tools.get('list-workflows')!.handler
      const result = await handler({}, {})

      expect(api.listWorkflows).toHaveBeenCalledWith({})
      expect(result.content[0].text).toContain('Default Workflow')
      expect(result.content[0].text).toContain('Active')
      expect(result.content[0].text).toContain('Draft')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerReferenceDataTools(server, api)

      vi.mocked(api.listWorkflows).mockRejectedValue(new Error('Internal error'))

      const handler = (server as any)._tools.get('list-workflows')!.handler
      const result = await handler({}, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Internal error')
    })
  })
})
