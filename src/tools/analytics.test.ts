import { describe, it, expect, vi } from 'vitest'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { AnalyticsApi } from '../api/analytics.js'
import { registerAnalyticsTools } from './analytics.js'

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
    getAutomationTrend: vi.fn(),
    getStatusDistribution: vi.fn(),
    getSuccessRate: vi.fn(),
  } as unknown as AnalyticsApi
}

describe('registerAnalyticsTools', () => {
  it('registers 3 tools with correct names', () => {
    const server = createMockServer()
    registerAnalyticsTools(server, createMockApi())

    expect(server.registerTool).toHaveBeenCalledTimes(3)
    const names = [...(server as any)._tools.keys()]
    expect(names).toEqual(['get-automation-trend', 'get-status-distribution', 'get-success-rate'])
  })

  describe('get-automation-trend handler', () => {
    it('returns formatted automation trend', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerAnalyticsTools(server, api)

      vi.mocked(api.getAutomationTrend).mockResolvedValue([
        { date: '2025-01-01', automatedCount: 50, manualCount: 30 },
      ])

      const handler = (server as any)._tools.get('get-automation-trend')!.handler
      const result = await handler({ projectId: 42 }, {})

      expect(api.getAutomationTrend).toHaveBeenCalledWith(42)
      expect(result.content[0].text).toContain('Automation Trend')
      expect(result.content[0].text).toContain('50')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerAnalyticsTools(server, api)

      vi.mocked(api.getAutomationTrend).mockRejectedValue(new Error('Service unavailable'))

      const handler = (server as any)._tools.get('get-automation-trend')!.handler
      const result = await handler({}, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Service unavailable')
    })
  })

  describe('get-status-distribution handler', () => {
    it('returns formatted status distribution', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerAnalyticsTools(server, api)

      vi.mocked(api.getStatusDistribution).mockResolvedValue([
        { statusName: 'Active', statusId: 1, count: 100 },
        { statusName: 'Draft', statusId: 2, count: 20 },
      ])

      const handler = (server as any)._tools.get('get-status-distribution')!.handler
      const result = await handler({ projectId: 42 }, {})

      expect(api.getStatusDistribution).toHaveBeenCalledWith(42)
      expect(result.content[0].text).toContain('Status Distribution')
      expect(result.content[0].text).toContain('Active')
      expect(result.content[0].text).toContain('100')
    })
  })

  describe('get-success-rate handler', () => {
    it('returns formatted success rate', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerAnalyticsTools(server, api)

      vi.mocked(api.getSuccessRate).mockResolvedValue([
        { date: '2025-01-01', avgSuccessRate: 95.5, testResultsCount: 200, testCasesCount: 100 },
      ])

      const handler = (server as any)._tools.get('get-success-rate')!.handler
      const result = await handler({ projectId: 42 }, {})

      expect(api.getSuccessRate).toHaveBeenCalledWith(42)
      expect(result.content[0].text).toContain('Success Rate')
      expect(result.content[0].text).toContain('95.5')
    })

    it('returns isError when API throws', async () => {
      const server = createMockServer()
      const api = createMockApi()
      registerAnalyticsTools(server, api)

      vi.mocked(api.getSuccessRate).mockRejectedValue(new Error('Bad request'))

      const handler = (server as any)._tools.get('get-success-rate')!.handler
      const result = await handler({}, {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Bad request')
    })
  })
})
