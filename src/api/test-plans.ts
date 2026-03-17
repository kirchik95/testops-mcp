import { HttpClient } from '../client/http-client.js';
import { TestPlan, CreateTestPlanRequest, UpdateTestPlanRequest, TestCase } from '../types/api-types.js';
import { PageResponse } from '../types/common.js';

export class TestPlansApi {
  constructor(private http: HttpClient) {}

  async list(projectId: number, params?: { page?: number; size?: number }): Promise<PageResponse<TestPlan>> {
    return this.http.get<PageResponse<TestPlan>>('/api/testplan', { projectId, ...params });
  }

  async getById(id: number): Promise<TestPlan> {
    return this.http.get<TestPlan>(`/api/testplan/${id}`);
  }

  async create(body: CreateTestPlanRequest): Promise<TestPlan> {
    return this.http.post<TestPlan>('/api/testplan', body);
  }

  async update(id: number, body: UpdateTestPlanRequest): Promise<TestPlan> {
    return this.http.patch<TestPlan>(`/api/testplan/${id}`, body);
  }

  async getTestCases(id: number, params?: { page?: number; size?: number }): Promise<PageResponse<TestCase>> {
    return this.http.get<PageResponse<TestCase>>(`/api/testplan/${id}/testcase`, params);
  }
}
