import { describe, it, expect, vi } from 'vitest'
import type { HttpClient } from '../client/http-client.js'
import { TestCasesApi } from './test-cases.js'

function createMockHttp(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient
}

describe('TestCasesApi', () => {
  describe('list', () => {
    it('calls GET /api/testcase with projectId and params', async () => {
      const http = createMockHttp()
      const expected = { content: [], totalPages: 1 }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.list(1, { page: 0, size: 20, search: 'login' })

      expect(http.get).toHaveBeenCalledWith('/api/testcase', { projectId: 1, page: 0, size: 20, search: 'login' })
      expect(result).toBe(expected)
    })

    it('calls GET /api/testcase with projectId only', async () => {
      const http = createMockHttp()
      const expected = { content: [] }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.list(1)

      expect(http.get).toHaveBeenCalledWith('/api/testcase', { projectId: 1 })
      expect(result).toBe(expected)
    })
  })

  describe('search', () => {
    it('calls GET /api/testcase/search with projectId and params', async () => {
      const http = createMockHttp()
      const expected = { content: [{ id: 1 }] }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.search(2, { rql: 'name~"auth"', page: 0, size: 10 })

      expect(http.get).toHaveBeenCalledWith('/api/testcase/search', { projectId: 2, rql: 'name~"auth"', page: 0, size: 10 })
      expect(result).toBe(expected)
    })
  })

  describe('getById', () => {
    it('calls GET /api/testcase/:id', async () => {
      const http = createMockHttp()
      const expected = { id: 77, name: 'TC-1' }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.getById(77)

      expect(http.get).toHaveBeenCalledWith('/api/testcase/77')
      expect(result).toBe(expected)
    })
  })

  describe('getOverview', () => {
    it('calls GET /api/testcase/:id/overview', async () => {
      const http = createMockHttp()
      const expected = { id: 5, name: 'TC-5', stats: {} }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.getOverview(5)

      expect(http.get).toHaveBeenCalledWith('/api/testcase/5/overview')
      expect(result).toBe(expected)
    })
  })

  describe('create', () => {
    it('calls POST /api/testcase with body', async () => {
      const http = createMockHttp()
      const body = { projectId: 1, name: 'New TC' } as any
      const expected = { id: 100, ...body }
      vi.mocked(http.post).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.create(body)

      expect(http.post).toHaveBeenCalledWith('/api/testcase', body)
      expect(result).toBe(expected)
    })
  })

  describe('update', () => {
    it('calls PATCH /api/testcase/:id with body', async () => {
      const http = createMockHttp()
      const body = { name: 'Updated TC' } as any
      const expected = { id: 10, name: 'Updated TC' }
      vi.mocked(http.patch).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.update(10, body)

      expect(http.patch).toHaveBeenCalledWith('/api/testcase/10', body)
      expect(result).toBe(expected)
    })
  })

  describe('delete', () => {
    it('calls DELETE /api/testcase/:id', async () => {
      const http = createMockHttp()
      vi.mocked(http.delete).mockResolvedValue(undefined)

      const api = new TestCasesApi(http)
      const result = await api.delete(10)

      expect(http.delete).toHaveBeenCalledWith('/api/testcase/10')
      expect(result).toBeUndefined()
    })
  })

  describe('getScenario', () => {
    it('calls GET /api/testcase/:id/scenario', async () => {
      const http = createMockHttp()
      const expected = { steps: [{ action: 'click' }] }
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.getScenario(12)

      expect(http.get).toHaveBeenCalledWith('/api/testcase/12/scenario')
      expect(result).toBe(expected)
    })
  })

  describe('updateScenario', () => {
    it('calls POST /api/testcase/:id/scenario with body', async () => {
      const http = createMockHttp()
      const scenario = { steps: [{ action: 'type' }] } as any
      const expected = scenario
      vi.mocked(http.post).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.updateScenario(12, scenario)

      expect(http.post).toHaveBeenCalledWith('/api/testcase/12/scenario', scenario)
      expect(result).toBe(expected)
    })
  })

  describe('getIssues', () => {
    it('calls GET /api/testcase/:id/issue', async () => {
      const http = createMockHttp()
      const expected = [{ id: 1, key: 'BUG-1' }]
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.getIssues(50)

      expect(http.get).toHaveBeenCalledWith('/api/testcase/50/issue')
      expect(result).toBe(expected)
    })
  })

  describe('setIssues', () => {
    it('calls POST /api/testcase/:id/issue with issues', async () => {
      const http = createMockHttp()
      const issues = [{ id: 1, key: 'BUG-2' }] as any
      const expected = issues
      vi.mocked(http.post).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.setIssues(50, issues)

      expect(http.post).toHaveBeenCalledWith('/api/testcase/50/issue', issues)
      expect(result).toBe(expected)
    })
  })

  describe('getMembers', () => {
    it('calls GET /api/testcase/:id/members', async () => {
      const http = createMockHttp()
      const expected = [{ id: 1, username: 'alice' }]
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.getMembers(60)

      expect(http.get).toHaveBeenCalledWith('/api/testcase/60/members')
      expect(result).toBe(expected)
    })
  })

  describe('setMembers', () => {
    it('calls POST /api/testcase/:id/members with members', async () => {
      const http = createMockHttp()
      const members = [{ id: 2, username: 'bob' }] as any
      const expected = members
      vi.mocked(http.post).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.setMembers(60, members)

      expect(http.post).toHaveBeenCalledWith('/api/testcase/60/members', members)
      expect(result).toBe(expected)
    })
  })

  describe('getCustomFields', () => {
    it('calls GET /api/testcase/:id/cfv with projectId', async () => {
      const http = createMockHttp()
      const expected = [{ id: 1, value: 'High' }]
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.getCustomFields(70, 3)

      expect(http.get).toHaveBeenCalledWith('/api/testcase/70/cfv', { projectId: 3 })
      expect(result).toBe(expected)
    })
  })

  describe('updateCustomFields', () => {
    it('reads current fields, merges with updates, and calls POST', async () => {
      const http = createMockHttp()
      const currentFields = [
        { id: 100, name: 'High', customField: { id: 5, name: 'Priority' } },
        { id: 200, name: 'Backend', customField: { id: 8, name: 'Component' } },
      ]
      const newFields = [
        { id: 101, name: 'Low', customField: { id: 5 } },
      ]
      vi.mocked(http.get).mockResolvedValue(currentFields)
      vi.mocked(http.post).mockResolvedValue(undefined)

      const api = new TestCasesApi(http)
      const result = await api.updateCustomFields(70, 3, newFields as any)

      expect(http.get).toHaveBeenCalledWith('/api/testcase/70/cfv', { projectId: 3 })
      expect(http.post).toHaveBeenCalledWith('/api/testcase/70/cfv', [
        { id: 200, name: 'Backend', customField: { id: 8, name: 'Component' } },
        { id: 101, name: 'Low', customField: { id: 5 } },
      ])
      expect(result).toBeUndefined()
    })

    it('sends only new fields when no existing fields', async () => {
      const http = createMockHttp()
      vi.mocked(http.get).mockResolvedValue([])
      vi.mocked(http.post).mockResolvedValue(undefined)

      const newFields = [{ id: 50, name: '', customField: { id: 10 } }]
      const api = new TestCasesApi(http)
      await api.updateCustomFields(70, 3, newFields as any)

      expect(http.post).toHaveBeenCalledWith('/api/testcase/70/cfv', newFields)
    })
  })

  describe('getRelations', () => {
    it('calls GET /api/testcase/:id/relation', async () => {
      const http = createMockHttp()
      const expected = [{ id: 1, type: 'BLOCKS' }]
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.getRelations(80)

      expect(http.get).toHaveBeenCalledWith('/api/testcase/80/relation')
      expect(result).toBe(expected)
    })
  })

  describe('setRelations', () => {
    it('calls POST /api/testcase/:id/relation with relations', async () => {
      const http = createMockHttp()
      const relations = [{ id: 2, type: 'DEPENDS_ON' }] as any
      const expected = relations
      vi.mocked(http.post).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.setRelations(80, relations)

      expect(http.post).toHaveBeenCalledWith('/api/testcase/80/relation', relations)
      expect(result).toBe(expected)
    })
  })

  describe('getRequirements', () => {
    it('calls GET /api/testcase/:id/requirement', async () => {
      const http = createMockHttp()
      const expected = [{ id: 1, name: 'REQ-1' }]
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.getRequirements(90)

      expect(http.get).toHaveBeenCalledWith('/api/testcase/90/requirement')
      expect(result).toBe(expected)
    })
  })

  describe('setRequirements', () => {
    it('calls POST /api/testcase/:id/requirement with requirements', async () => {
      const http = createMockHttp()
      const requirements = [{ id: 3, name: 'REQ-3' }] as any
      const expected = requirements
      vi.mocked(http.post).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.setRequirements(90, requirements)

      expect(http.post).toHaveBeenCalledWith('/api/testcase/90/requirement', requirements)
      expect(result).toBe(expected)
    })
  })

  describe('getTestKeys', () => {
    it('calls GET /api/testcase/:id/testkey', async () => {
      const http = createMockHttp()
      const expected = [{ id: 1, key: 'TK-1' }]
      vi.mocked(http.get).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.getTestKeys(100)

      expect(http.get).toHaveBeenCalledWith('/api/testcase/100/testkey')
      expect(result).toBe(expected)
    })
  })

  describe('setTestKeys', () => {
    it('calls POST /api/testcase/:id/testkey with testKeys', async () => {
      const http = createMockHttp()
      const testKeys = [{ id: 2, key: 'TK-2' }] as any
      const expected = testKeys
      vi.mocked(http.post).mockResolvedValue(expected)

      const api = new TestCasesApi(http)
      const result = await api.setTestKeys(100, testKeys)

      expect(http.post).toHaveBeenCalledWith('/api/testcase/100/testkey', testKeys)
      expect(result).toBe(expected)
    })
  })

  describe('getLinks', () => {
    it('calls getById and returns links from the result', async () => {
      const http = createMockHttp()
      const links = [{ url: 'https://example.com', name: 'Docs' }]
      vi.mocked(http.get).mockResolvedValue({ id: 55, name: 'TC', links })

      const api = new TestCasesApi(http)
      const result = await api.getLinks(55)

      expect(http.get).toHaveBeenCalledWith('/api/testcase/55')
      expect(result).toEqual(links)
    })

    it('returns empty array when links are undefined', async () => {
      const http = createMockHttp()
      vi.mocked(http.get).mockResolvedValue({ id: 55, name: 'TC' })

      const api = new TestCasesApi(http)
      const result = await api.getLinks(55)

      expect(http.get).toHaveBeenCalledWith('/api/testcase/55')
      expect(result).toEqual([])
    })
  })
})
