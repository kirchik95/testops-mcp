import { describe, it, expect, vi } from 'vitest'
import type { HttpClient } from '../client/http-client.js'
import { ReferenceDataApi } from './reference-data.js'

function createMockHttp(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient
}

describe('ReferenceDataApi', () => {
  describe('listTestLayers', () => {
    it('calls GET /api/testlayer with params', async () => {
      const http = createMockHttp()
      const expected = { content: [{ id: 1, name: 'Unit' }], totalPages: 1 }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new ReferenceDataApi(http)
      const result = await api.listTestLayers({ page: 0, size: 10 })

      expect(http.get).toHaveBeenCalledWith('/api/testlayer', { page: 0, size: 10 })
      expect(result).toBe(expected)
    })

    it('calls GET /api/testlayer without params', async () => {
      const http = createMockHttp()
      const expected = { content: [] }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new ReferenceDataApi(http)
      const result = await api.listTestLayers()

      expect(http.get).toHaveBeenCalledWith('/api/testlayer', undefined)
      expect(result).toBe(expected)
    })
  })

  describe('listWorkflows', () => {
    it('calls GET /api/workflow with params', async () => {
      const http = createMockHttp()
      const expected = { content: [{ id: 2, name: 'Default' }], totalPages: 1 }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new ReferenceDataApi(http)
      const result = await api.listWorkflows({ page: 0, size: 5 })

      expect(http.get).toHaveBeenCalledWith('/api/workflow', { page: 0, size: 5 })
      expect(result).toBe(expected)
    })

    it('calls GET /api/workflow without params', async () => {
      const http = createMockHttp()
      const expected = { content: [] }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new ReferenceDataApi(http)
      const result = await api.listWorkflows()

      expect(http.get).toHaveBeenCalledWith('/api/workflow', undefined)
      expect(result).toBe(expected)
    })
  })
})
