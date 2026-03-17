import { HttpClient } from '../client/http-client.js';
import { TestResult, UpdateTestResultRequest } from '../types/api-types.js';
import { PageResponse } from '../types/common.js';

export class TestResultsApi {
  constructor(private http: HttpClient) {}

  async list(projectId: number, params?: { page?: number; size?: number; launchId?: number }): Promise<PageResponse<TestResult>> {
    return this.http.get<PageResponse<TestResult>>('/api/testresult', { projectId, ...params });
  }

  async getById(id: number): Promise<TestResult> {
    return this.http.get<TestResult>(`/api/testresult/${id}`);
  }

  async update(id: number, body: UpdateTestResultRequest): Promise<TestResult> {
    return this.http.patch<TestResult>(`/api/testresult/${id}`, body);
  }
}
