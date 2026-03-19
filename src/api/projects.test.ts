import { describe, it, expect, vi } from 'vitest'
import type { HttpClient } from '../client/http-client.js'
import { ProjectsApi } from './projects.js'

function createMockHttp(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient
}

describe('ProjectsApi', () => {
  describe('list', () => {
    it('calls GET /api/project with params', async () => {
      const http = createMockHttp()
      const expected = { content: [], totalPages: 1 }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new ProjectsApi(http)
      const result = await api.list({ page: 0, size: 20 })

      expect(http.get).toHaveBeenCalledWith('/api/project', { page: 0, size: 20 })
      expect(result).toBe(expected)
    })

    it('calls GET /api/project without params', async () => {
      const http = createMockHttp()
      const expected = { content: [] }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new ProjectsApi(http)
      const result = await api.list()

      expect(http.get).toHaveBeenCalledWith('/api/project', undefined)
      expect(result).toBe(expected)
    })
  })

  describe('getById', () => {
    it('calls GET /api/project/:id', async () => {
      const http = createMockHttp()
      const expected = { id: 42, name: 'My Project' }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new ProjectsApi(http)
      const result = await api.getById(42)

      expect(http.get).toHaveBeenCalledWith('/api/project/42')
      expect(result).toBe(expected)
    })
  })
})
