import { HttpClient } from '../client/http-client.js';
import { TestCase, CreateTestCaseRequest, UpdateTestCaseRequest, TestCaseScenario } from '../types/api-types.js';
import { PageResponse } from '../types/common.js';

export class TestCasesApi {
  constructor(private http: HttpClient) {}

  async list(projectId: number, params?: { page?: number; size?: number; search?: string }): Promise<PageResponse<TestCase>> {
    return this.http.get<PageResponse<TestCase>>('/api/testcase', { projectId, ...params });
  }

  async search(projectId: number, params?: { rql?: string; page?: number; size?: number }): Promise<PageResponse<TestCase>> {
    return this.http.get<PageResponse<TestCase>>('/api/testcase/search', { projectId, ...params });
  }

  async getById(id: number): Promise<TestCase> {
    return this.http.get<TestCase>(`/api/testcase/${id}`);
  }

  async create(body: CreateTestCaseRequest): Promise<TestCase> {
    return this.http.post<TestCase>('/api/testcase', body);
  }

  async update(id: number, body: UpdateTestCaseRequest): Promise<TestCase> {
    return this.http.patch<TestCase>(`/api/testcase/${id}`, body);
  }

  async delete(id: number): Promise<void> {
    return this.http.delete<void>(`/api/testcase/${id}`);
  }

  async getScenario(id: number): Promise<TestCaseScenario> {
    return this.http.get<TestCaseScenario>(`/api/testcase/${id}/scenario`);
  }

  async updateScenario(id: number, scenario: TestCaseScenario): Promise<TestCaseScenario> {
    return this.http.post<TestCaseScenario>(`/api/testcase/${id}/scenario`, scenario);
  }
}
