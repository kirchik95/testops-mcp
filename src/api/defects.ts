import { HttpClient } from '../client/http-client.js';
import { Defect, CreateDefectRequest, UpdateDefectRequest } from '../types/api-types.js';
import { PageResponse } from '../types/common.js';

export class DefectsApi {
  constructor(private http: HttpClient) {}

  async list(projectId: number, params?: { page?: number; size?: number }): Promise<PageResponse<Defect>> {
    return this.http.get<PageResponse<Defect>>('/api/defect', { projectId, ...params });
  }

  async getById(id: number): Promise<Defect> {
    return this.http.get<Defect>(`/api/defect/${id}`);
  }

  async create(body: CreateDefectRequest): Promise<Defect> {
    return this.http.post<Defect>('/api/defect', body);
  }

  async update(id: number, body: UpdateDefectRequest): Promise<Defect> {
    return this.http.patch<Defect>(`/api/defect/${id}`, body);
  }
}
