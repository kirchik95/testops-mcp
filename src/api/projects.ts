import { HttpClient } from '../client/http-client.js';
import { Project } from '../types/api-types.js';
import { PageResponse } from '../types/common.js';

export class ProjectsApi {
  constructor(private http: HttpClient) {}

  async list(params?: { page?: number; size?: number }): Promise<PageResponse<Project>> {
    return this.http.get<PageResponse<Project>>('/api/project', params);
  }

  async getById(id: number): Promise<Project> {
    return this.http.get<Project>(`/api/project/${id}`);
  }
}
