import { describe, it, expect, vi } from 'vitest'
import type { HttpClient } from '../client/http-client.js'
import { DefectsApi } from './defects.js'

function createMockHttp(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient
}

describe('DefectsApi', () => {
  describe('list', () => {
    it('calls GET /api/defect with projectId and params', async () => {
      const http = createMockHttp()
      const expected = { content: [], totalPages: 1 }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new DefectsApi(http)
      const result = await api.list(10, { page: 0, size: 25 })

      expect(http.get).toHaveBeenCalledWith('/api/defect', { projectId: 10, page: 0, size: 25 })
      expect(result).toBe(expected)
    })

    it('calls GET /api/defect with projectId only', async () => {
      const http = createMockHttp()
      const expected = { content: [] }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new DefectsApi(http)
      const result = await api.list(5)

      expect(http.get).toHaveBeenCalledWith('/api/defect', { projectId: 5 })
      expect(result).toBe(expected)
    })
  })

  describe('getById', () => {
    it('calls GET /api/defect/:id', async () => {
      const http = createMockHttp()
      const expected = { id: 7, title: 'Bug' }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new DefectsApi(http)
      const result = await api.getById(7)

      expect(http.get).toHaveBeenCalledWith('/api/defect/7')
      expect(result).toBe(expected)
    })
  })

  describe('create', () => {
    it('calls POST /api/defect with body', async () => {
      const http = createMockHttp()
      const body = { projectId: 1, name: 'New defect' } as any
      const expected = { id: 99, ...body }
      vi.mocked(http.post).mockResolvedValue(expected)

      const api = new DefectsApi(http)
      const result = await api.create(body)

      expect(http.post).toHaveBeenCalledWith('/api/defect', body)
      expect(result).toBe(expected)
    })
  })

  describe('update', () => {
    it('calls PATCH /api/defect/:id with body', async () => {
      const http = createMockHttp()
      const body = { name: 'Updated defect' } as any
      const expected = { id: 3, name: 'Updated defect' }
      vi.mocked(http.patch).mockResolvedValue(expected)

      const api = new DefectsApi(http)
      const result = await api.update(3, body)

      expect(http.patch).toHaveBeenCalledWith('/api/defect/3', body)
      expect(result).toBe(expected)
    })
  })
})
