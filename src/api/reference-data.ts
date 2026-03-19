import { HttpClient } from '../client/http-client.js';
import { TestLayer, Workflow } from '../types/api-types.js';
import { PageResponse } from '../types/common.js';

export class ReferenceDataApi {
  constructor(private http: HttpClient) {}

  async listTestLayers(params?: { page?: number; size?: number }): Promise<PageResponse<TestLayer>> {
    return this.http.get<PageResponse<TestLayer>>('/api/testlayer', params);
  }

  async listWorkflows(params?: { page?: number; size?: number }): Promise<PageResponse<Workflow>> {
    return this.http.get<PageResponse<Workflow>>('/api/workflow', params);
  }
}
