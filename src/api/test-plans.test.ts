import { describe, it, expect, vi } from 'vitest'
import type { HttpClient } from '../client/http-client.js'
import { TestPlansApi } from './test-plans.js'

function createMockHttp(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient
}

describe('TestPlansApi', () => {
  describe('list', () => {
    it('calls GET /api/testplan with projectId and params', async () => {
      const http = createMockHttp()
      const expected = { content: [], totalPages: 2 }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestPlansApi(http)
      const result = await api.list(3, { page: 1, size: 10 })

      expect(http.get).toHaveBeenCalledWith('/api/testplan', { projectId: 3, page: 1, size: 10 })
      expect(result).toBe(expected)
    })

    it('calls GET /api/testplan with projectId only', async () => {
      const http = createMockHttp()
      const expected = { content: [] }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestPlansApi(http)
      const result = await api.list(5)

      expect(http.get).toHaveBeenCalledWith('/api/testplan', { projectId: 5 })
      expect(result).toBe(expected)
    })
  })

  describe('getById', () => {
    it('calls GET /api/testplan/:id', async () => {
      const http = createMockHttp()
      const expected = { id: 11, name: 'Plan A' }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestPlansApi(http)
      const result = await api.getById(11)

      expect(http.get).toHaveBeenCalledWith('/api/testplan/11')
      expect(result).toBe(expected)
    })
  })

  describe('create', () => {
    it('calls POST /api/testplan with body', async () => {
      const http = createMockHttp()
      const body = { projectId: 2, name: 'New plan' } as any
      const expected = { id: 55, ...body }
      vi.mocked(http.post).mockResolvedValue(expected)

      const api = new TestPlansApi(http)
      const result = await api.create(body)

      expect(http.post).toHaveBeenCalledWith('/api/testplan', body)
      expect(result).toBe(expected)
    })
  })

  describe('update', () => {
    it('calls PATCH /api/testplan/:id with body', async () => {
      const http = createMockHttp()
      const body = { name: 'Updated plan' } as any
      const expected = { id: 8, name: 'Updated plan' }
      vi.mocked(http.patch).mockResolvedValue(expected)

      const api = new TestPlansApi(http)
      const result = await api.update(8, body)

      expect(http.patch).toHaveBeenCalledWith('/api/testplan/8', body)
      expect(result).toBe(expected)
    })
  })

  describe('getTestCases', () => {
    it('calls GET /api/testplan/:id/testcase with params', async () => {
      const http = createMockHttp()
      const expected = { content: [{ id: 1 }], totalPages: 1 }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestPlansApi(http)
      const result = await api.getTestCases(20, { page: 0, size: 50 })

      expect(http.get).toHaveBeenCalledWith('/api/testplan/20/testcase', { page: 0, size: 50 })
      expect(result).toBe(expected)
    })

    it('calls GET /api/testplan/:id/testcase without params', async () => {
      const http = createMockHttp()
      const expected = { content: [] }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestPlansApi(http)
      const result = await api.getTestCases(20)

      expect(http.get).toHaveBeenCalledWith('/api/testplan/20/testcase', undefined)
      expect(result).toBe(expected)
    })
  })
})
