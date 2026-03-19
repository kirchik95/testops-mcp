// Project
export interface Project {
  id: number;
  name: string;
  isPublic: boolean;
  createdDate?: number;
  lastModifiedDate?: number;
}

// Test Case (matches TestCaseDto from API)
export interface TestCase {
  id: number;
  name: string;
  description?: string;
  projectId: number;
  status?: StatusRef;
  testLayer?: StatusRef;
  automated?: boolean;
  tags?: Tag[];
  createdDate?: number;
  lastModifiedDate?: number;
  createdBy?: string;
  lastModifiedBy?: string;
  links?: ExternalLink[];
  precondition?: string;
  expectedResult?: string;
  fullName?: string;
  duration?: number;
  workflow?: StatusRef;
}

// Test Case Overview (matches TestCaseOverviewDto — full info including sub-resources)
export interface TestCaseOverview extends TestCase {
  members?: MemberDto[];
  customFields?: CustomFieldValueWithCf[];
  issues?: IssueDto[];
  requirements?: RequirementDto[];
  testKeys?: TestKeyDto[];
}

// Matches TestCaseCreateV2Dto
export interface CreateTestCaseRequest {
  name: string;
  projectId: number;
  description?: string;
  statusId?: number;
  testLayerId?: number;
  automated?: boolean;
  tags?: { name: string }[];
  precondition?: string;
  expectedResult?: string;
  fullName?: string;
  links?: ExternalLink[];
  members?: MemberDto[];
  customFields?: CustomFieldValueWithCf[];
  workflowId?: number;
}

// Matches TestCasePatchV2Dto
export interface UpdateTestCaseRequest {
  name?: string;
  description?: string;
  statusId?: number;
  testLayerId?: number;
  automated?: boolean;
  tags?: { name: string }[];
  precondition?: string;
  expectedResult?: string;
  fullName?: string;
  links?: ExternalLink[];
  members?: MemberDto[];
  customFields?: CustomFieldValueWithCf[];
  duration?: number;
  workflowId?: number;
}

export interface TestCaseScenario {
  steps: TestCaseStep[];
}

export interface TestCaseStep {
  name: string;
  keyword?: string; // Given, When, Then, And
  expectedResult?: string;
  steps?: TestCaseStep[]; // nested steps
}

// Test Plan
export interface TestPlan {
  id: number;
  name: string;
  projectId: number;
  description?: string;
  status?: string;
  createdDate?: number;
  lastModifiedDate?: number;
  createdBy?: string;
}

export interface CreateTestPlanRequest {
  name: string;
  projectId: number;
  description?: string;
}

export interface UpdateTestPlanRequest {
  name?: string;
  description?: string;
  status?: string;
}

// Launch (matches LaunchDto / LaunchPreviewDto from API)
export type TestStatus = 'failed' | 'broken' | 'passed' | 'skipped' | 'unknown' | 'in_progress';

export interface TestStatusCount {
  status: TestStatus;
  count: number;
}

export interface Launch {
  id: number;
  name: string;
  projectId?: number;
  closed?: boolean;
  external?: boolean;
  autoclose?: boolean;
  createdDate?: number;
  lastModifiedDate?: number;
  createdBy?: string;
  lastModifiedBy?: string;
  tags?: Tag[];
  issues?: ExternalLink[];
  links?: ExternalLink[];
  releaseId?: number;
  statistic?: TestStatusCount[];
}

// Test Result (matches TestResultDto from API)
export interface TestResult {
  id: number;
  name: string;
  status?: TestStatus;
  launchId?: number;
  testCaseId?: number;
  projectId?: number;
  duration?: number;
  message?: string;
  trace?: string;
  createdDate?: number;
  lastModifiedDate?: number;
  createdBy?: string;
  lastModifiedBy?: string;
  manual?: boolean;
  assignee?: string;
  flaky?: boolean;
  muted?: boolean;
  known?: boolean;
}

export interface UpdateTestResultRequest {
  status?: string;
  comment?: string;
}

// Defect
export interface Defect {
  id: number;
  name: string;
  projectId: number;
  status?: string;
  description?: string;
  createdDate?: number;
  closedDate?: number;
  createdBy?: string;
}

export interface CreateDefectRequest {
  name: string;
  projectId: number;
  description?: string;
}

export interface UpdateDefectRequest {
  name?: string;
  description?: string;
  status?: string;
}

// Analytics (matches real API DTOs)
export interface AutomationTrendPoint {
  date: string;
  automatedCount: number;
  manualCount: number;
  sumDurationAutomated?: number;
  sumDurationManual?: number;
}

export interface StatusDistribution {
  statusName: string;
  statusId: number;
  statusColor?: string;
  count: number;
}

export interface SuccessRatePoint {
  date: string;
  avgSuccessRate: number;
  testResultsCount: number;
  testCasesCount: number;
  avgDuration?: number;
  sumDuration?: number;
  retriedCount?: number;
  notRetriedCount?: number;
}

// Shared
export interface Tag {
  id?: number;
  name: string;
}

export interface StatusRef {
  id?: number;
  name?: string;
}

export interface ExternalLink {
  name?: string;
  url?: string;
  type?: string;
}

export interface MemberDto {
  id?: number;
  name?: string;
  role?: RoleDto;
}

export interface RoleDto {
  id?: number;
  name?: string;
}

export interface IssueDto {
  id?: number;
  name?: string;
  url?: string;
  displayName?: string;
  integrationId?: number;
  integrationType?: string;
  status?: string;
  summary?: string;
  closed?: boolean;
}

export interface CustomFieldDto {
  id?: number;
  name?: string;
  required?: boolean;
  singleSelect?: boolean;
  archived?: boolean;
  locked?: boolean;
}

export interface CustomFieldValueDto {
  id?: number;
  name?: string;
}

export interface CustomFieldValueWithCf {
  id?: number;
  name?: string;
  customField?: CustomFieldDto;
  global?: boolean;
}

export interface CustomFieldWithValues {
  customField?: CustomFieldDto;
  values?: CustomFieldValueDto[];
}

export interface RequirementDto {
  id?: number;
  name?: string;
  displayName?: string;
  title?: string;
  url?: string;
  integrationId?: number;
  integrationType?: string;
}

export interface TestKeyDto {
  id?: number;
  name?: string;
  url?: string;
  integrationId?: number;
}

export interface TestCaseRelationDto {
  id?: number;
  target?: { id: number; name?: string };
  type?: TestCaseRelationType;
}

export type TestCaseRelationType =
  | 'related to'
  | 'clones'
  | 'is cloned by'
  | 'duplicates'
  | 'is duplicated by'
  | 'automates'
  | 'is automated by';
