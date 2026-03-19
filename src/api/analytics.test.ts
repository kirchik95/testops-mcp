import { describe, it, expect, vi } from 'vitest'
import type { HttpClient } from '../client/http-client.js'
import { AnalyticsApi } from './analytics.js'

function createMockHttp(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient
}

describe('AnalyticsApi', () => {
  describe('getAutomationTrend', () => {
    it('calls GET /api/analytic/:projectId/automation_chart', async () => {
      const http = createMockHttp()
      const expected = [{ date: '2025-01-01', automated: 10 }]
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new AnalyticsApi(http)
      const result = await api.getAutomationTrend(6)

      expect(http.get).toHaveBeenCalledWith('/api/analytic/6/automation_chart')
      expect(result).toBe(expected)
    })
  })

  describe('getStatusDistribution', () => {
    it('calls GET /api/analytic/:projectId/group_by_status', async () => {
      const http = createMockHttp()
      const expected = [{ status: 'PASSED', count: 50 }]
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new AnalyticsApi(http)
      const result = await api.getStatusDistribution(6)

      expect(http.get).toHaveBeenCalledWith('/api/analytic/6/group_by_status')
      expect(result).toBe(expected)
    })
  })

  describe('getSuccessRate', () => {
    it('calls GET /api/analytic/:projectId/tc_success_rate', async () => {
      const http = createMockHttp()
      const expected = [{ date: '2025-01-01', rate: 0.95 }]
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new AnalyticsApi(http)
      const result = await api.getSuccessRate(6)

      expect(http.get).toHaveBeenCalledWith('/api/analytic/6/tc_success_rate')
      expect(result).toBe(expected)
    })
  })
})
