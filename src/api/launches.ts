import { HttpClient } from '../client/http-client.js';
import { Launch, LaunchStatistic, TestResult } from '../types/api-types.js';
import { PageResponse } from '../types/common.js';

export class LaunchesApi {
  constructor(private http: HttpClient) {}

  async list(projectId: number, params?: { page?: number; size?: number }): Promise<PageResponse<Launch>> {
    return this.http.get<PageResponse<Launch>>('/api/launch', { projectId, ...params });
  }

  async getById(id: number): Promise<Launch> {
    return this.http.get<Launch>(`/api/launch/${id}`);
  }

  async getStatistic(id: number): Promise<LaunchStatistic | null> {
    try {
      return await this.http.get<LaunchStatistic>(`/api/launch/${id}/statistic`);
    } catch {
      return null;
    }
  }

  async getTestResults(id: number, params?: { page?: number; size?: number }): Promise<PageResponse<TestResult>> {
    return this.http.get<PageResponse<TestResult>>('/api/testresult', { launchId: id, ...params });
  }
}
