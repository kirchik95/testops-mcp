import { describe, it, expect, vi } from 'vitest'
import type { HttpClient } from '../client/http-client.js'
import { TestResultsApi } from './test-results.js'

function createMockHttp(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient
}

describe('TestResultsApi', () => {
  describe('list', () => {
    it('calls GET /api/testresult with projectId and params', async () => {
      const http = createMockHttp()
      const expected = { content: [], totalPages: 3 }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestResultsApi(http)
      const result = await api.list(7, { page: 2, size: 10, launchId: 99 })

      expect(http.get).toHaveBeenCalledWith('/api/testresult', { projectId: 7, page: 2, size: 10, launchId: 99 })
      expect(result).toBe(expected)
    })

    it('calls GET /api/testresult with projectId only', async () => {
      const http = createMockHttp()
      const expected = { content: [] }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestResultsApi(http)
      const result = await api.list(7)

      expect(http.get).toHaveBeenCalledWith('/api/testresult', { projectId: 7 })
      expect(result).toBe(expected)
    })
  })

  describe('getById', () => {
    it('calls GET /api/testresult/:id', async () => {
      const http = createMockHttp()
      const expected = { id: 44, status: 'PASSED' }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestResultsApi(http)
      const result = await api.getById(44)

      expect(http.get).toHaveBeenCalledWith('/api/testresult/44')
      expect(result).toBe(expected)
    })
  })

  describe('update', () => {
    it('calls PATCH /api/testresult/:id with body', async () => {
      const http = createMockHttp()
      const body = { status: 'FAILED' } as any
      const expected = { id: 44, status: 'FAILED' }
      vi.mocked(http.patch).mockResolvedValue(expected)

      const api = new TestResultsApi(http)
      const result = await api.update(44, body)

      expect(http.patch).toHaveBeenCalledWith('/api/testresult/44', body)
      expect(result).toBe(expected)
    })
  })
})
