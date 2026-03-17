// Project
export interface Project {
  id: number;
  name: string;
  isPublic: boolean;
  createdDate?: number;
  lastModifiedDate?: number;
}

// Test Case
export interface TestCase {
  id: number;
  name: string;
  description?: string;
  projectId: number;
  status?: string; // Active, Draft, Deprecated, etc.
  layer?: string; // UI, API, Unit
  automated?: boolean;
  tags?: Tag[];
  createdDate?: number;
  lastModifiedDate?: number;
  createdBy?: string;
  lastModifiedBy?: string;
  members?: Member[];
  links?: Link[];
  customFields?: CustomFieldValue[];
  precondition?: string;
  expectedResult?: string;
}

export interface CreateTestCaseRequest {
  name: string;
  projectId: number;
  description?: string;
  status?: string;
  layer?: string;
  automated?: boolean;
  tags?: { name: string }[];
  precondition?: string;
  expectedResult?: string;
}

export interface UpdateTestCaseRequest {
  name?: string;
  description?: string;
  status?: string;
  layer?: string;
  automated?: boolean;
  tags?: { name: string }[];
  precondition?: string;
  expectedResult?: string;
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
  issues?: Link[];
  links?: Link[];
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

export interface Member {
  id?: number;
  userName?: string;
  role?: string;
}

export interface Link {
  id?: number;
  name?: string;
  url?: string;
  type?: string;
}

export interface CustomFieldValue {
  id?: number;
  name?: string;
  value?: string;
}
