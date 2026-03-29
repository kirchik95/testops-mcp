import { describe, it, expect, vi } from 'vitest'
import type { HttpClient } from '../client/http-client.js'
import { LaunchesApi } from './launches.js'

function createMockHttp(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient
}

describe('LaunchesApi', () => {
  describe('list', () => {
    it('calls GET /api/launch with projectId and params', async () => {
      const http = createMockHttp()
      const expected = { content: [], totalPages: 1 }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new LaunchesApi(http)
      const result = await api.list(4, { page: 0, size: 10 })

      expect(http.get).toHaveBeenCalledWith('/api/launch', { projectId: 4, page: 0, size: 10 })
      expect(result).toBe(expected)
    })

    it('calls GET /api/launch with projectId only', async () => {
      const http = createMockHttp()
      const expected = { content: [] }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new LaunchesApi(http)
      const result = await api.list(4)

      expect(http.get).toHaveBeenCalledWith('/api/launch', { projectId: 4 })
      expect(result).toBe(expected)
    })
  })

  describe('getById', () => {
    it('calls GET /api/launch/:id', async () => {
      const http = createMockHttp()
      const expected = { id: 15, name: 'Launch X' }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new LaunchesApi(http)
      const result = await api.getById(15)

      expect(http.get).toHaveBeenCalledWith('/api/launch/15')
      expect(result).toBe(expected)
    })
  })

  describe('getStatistic', () => {
    it('calls GET /api/launch/:id/statistic and returns data', async () => {
      const http = createMockHttp()
      const expected = [{ status: 'PASSED', count: 5 }]
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new LaunchesApi(http)
      const result = await api.getStatistic(15)

      expect(http.get).toHaveBeenCalledWith('/api/launch/15/statistic')
      expect(result).toBe(expected)
    })

    it('propagates errors instead of silently swallowing them', async () => {
      const http = createMockHttp()
      vi.mocked(http.get).mockRejectedValue(new Error('API error 500'))

      const api = new LaunchesApi(http)

      await expect(api.getStatistic(15)).rejects.toThrow('API error 500')
      expect(http.get).toHaveBeenCalledWith('/api/launch/15/statistic')
    })
  })

  describe('getTestResults', () => {
    it('calls GET /api/testresult with launchId and params', async () => {
      const http = createMockHttp()
      const expected = { content: [{ id: 1 }], totalPages: 1 }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new LaunchesApi(http)
      const result = await api.getTestResults(30, { page: 0, size: 25 })

      expect(http.get).toHaveBeenCalledWith('/api/testresult', { launchId: 30, page: 0, size: 25 })
      expect(result).toBe(expected)
    })

    it('calls GET /api/testresult with launchId only', async () => {
      const http = createMockHttp()
      const expected = { content: [] }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new LaunchesApi(http)
      const result = await api.getTestResults(30)

      expect(http.get).toHaveBeenCalledWith('/api/testresult', { launchId: 30 })
      expect(result).toBe(expected)
    })
  })
})
