import { HttpClient } from '../client/http-client.js';
import {
  TestCase, TestCaseOverview, CreateTestCaseRequest, UpdateTestCaseRequest,
  TestCaseScenario, IssueDto, MemberDto, CustomFieldValueWithCf,
  TestCaseRelationDto, RequirementDto, TestKeyDto, ExternalLink,
} from '../types/api-types.js';
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

  async getOverview(id: number): Promise<TestCaseOverview> {
    return this.http.get<TestCaseOverview>(`/api/testcase/${id}/overview`);
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

  // --- Sub-resource endpoints ---

  async getIssues(testCaseId: number): Promise<IssueDto[]> {
    return this.http.get<IssueDto[]>(`/api/testcase/${testCaseId}/issue`);
  }

  async setIssues(testCaseId: number, issues: IssueDto[]): Promise<IssueDto[]> {
    return this.http.post<IssueDto[]>(`/api/testcase/${testCaseId}/issue`, issues);
  }

  async getMembers(testCaseId: number): Promise<MemberDto[]> {
    return this.http.get<MemberDto[]>(`/api/testcase/${testCaseId}/members`);
  }

  async setMembers(testCaseId: number, members: MemberDto[]): Promise<MemberDto[]> {
    return this.http.post<MemberDto[]>(`/api/testcase/${testCaseId}/members`, members);
  }

  async getCustomFields(testCaseId: number, projectId: number): Promise<CustomFieldValueWithCf[]> {
    return this.http.get<CustomFieldValueWithCf[]>(`/api/testcase/${testCaseId}/cfv`, { projectId });
  }

  async updateCustomFields(testCaseId: number, projectId: number, fields: CustomFieldValueWithCf[]): Promise<void> {
    const current = await this.getCustomFields(testCaseId, projectId);
    const merged = this.mergeCustomFields(current, fields);
    return this.http.post<void>(`/api/testcase/${testCaseId}/cfv`, merged);
  }

  private mergeCustomFields(current: CustomFieldValueWithCf[], updates: CustomFieldValueWithCf[]): CustomFieldValueWithCf[] {
    const updatedFieldIds = new Set(updates.map(u => u.customField?.id).filter(Boolean));
    const kept = current.filter(c => !updatedFieldIds.has(c.customField?.id));
    return [...kept, ...updates];
  }

  async getRelations(testCaseId: number): Promise<TestCaseRelationDto[]> {
    return this.http.get<TestCaseRelationDto[]>(`/api/testcase/${testCaseId}/relation`);
  }

  async setRelations(testCaseId: number, relations: TestCaseRelationDto[]): Promise<TestCaseRelationDto[]> {
    return this.http.post<TestCaseRelationDto[]>(`/api/testcase/${testCaseId}/relation`, relations);
  }

  async getRequirements(testCaseId: number): Promise<RequirementDto[]> {
    return this.http.get<RequirementDto[]>(`/api/testcase/${testCaseId}/requirement`);
  }

  async setRequirements(testCaseId: number, requirements: RequirementDto[]): Promise<RequirementDto[]> {
    return this.http.post<RequirementDto[]>(`/api/testcase/${testCaseId}/requirement`, requirements);
  }

  async getTestKeys(testCaseId: number): Promise<TestKeyDto[]> {
    return this.http.get<TestKeyDto[]>(`/api/testcase/${testCaseId}/testkey`);
  }

  async setTestKeys(testCaseId: number, testKeys: TestKeyDto[]): Promise<TestKeyDto[]> {
    return this.http.post<TestKeyDto[]>(`/api/testcase/${testCaseId}/testkey`, testKeys);
  }

  async getLinks(testCaseId: number): Promise<ExternalLink[]> {
    const tc = await this.getById(testCaseId);
    return tc.links ?? [];
  }
}
