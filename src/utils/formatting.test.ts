import {
  formatProjects, formatProject,
  formatTestCases, formatTestCase, formatTestCaseOverview,
  formatIssues, formatMembers, formatCustomFields, formatRelations,
  formatRequirements, formatTestKeys, formatExternalLinks,
  formatScenario,
  formatTestPlans, formatTestPlan,
  formatLaunches, formatLaunch,
  formatTestResults, formatTestResult,
  formatDefects, formatDefect,
  formatAutomationTrend, formatStatusDistribution, formatSuccessRate,
  formatTestLayers, formatWorkflows,
} from './formatting.js';

import type {
  Project, TestCase, TestCaseOverview, TestPlan, Launch, TestResult, Defect,
  AutomationTrendPoint, StatusDistribution, SuccessRatePoint,
  TestCaseScenario, IssueDto, MemberDto, CustomFieldValueWithCf,
  TestCaseRelationDto, RequirementDto, TestKeyDto, ExternalLink,
  TestLayer, Workflow,
} from '../types/api-types.js';

import type { PageResponse } from '../types/common.js';

function page<T>(content: T[], total = content.length, pages = 1): PageResponse<T> {
  return { content, totalElements: total, totalPages: pages, number: 0, size: 20 };
}

// ── Projects ─────────────────────────────────────────────

describe('formatProjects', () => {
  it('returns fallback for empty list', () => {
    expect(formatProjects(page([]))).toBe('No projects found.');
  });

  it('formats a list of projects', () => {
    const data = page<Project>([
      { id: 1, name: 'Alpha', isPublic: true },
      { id: 2, name: 'Beta', isPublic: false },
    ], 2);
    const out = formatProjects(data);
    expect(out).toContain('Found 2 project(s)');
    expect(out).toContain('[#1] Alpha (Public)');
    expect(out).toContain('[#2] Beta (Private)');
  });
});

describe('formatProject', () => {
  it('formats a single project', () => {
    const out = formatProject({ id: 5, name: 'Proj', isPublic: true, createdDate: 1700000000000 });
    expect(out).toContain('Project #5: Proj');
    expect(out).toContain('Public: Yes');
    expect(out).toContain('Created:');
  });

  it('omits optional dates when missing', () => {
    const out = formatProject({ id: 1, name: 'X', isPublic: false });
    expect(out).not.toContain('Created:');
    expect(out).not.toContain('Modified:');
    expect(out).toContain('Public: No');
  });
});

// ── Test Cases ───────────────────────────────────────────

describe('formatTestCases', () => {
  it('returns fallback for empty list', () => {
    expect(formatTestCases(page([]))).toBe('No test cases found.');
  });

  it('formats test cases with tags', () => {
    const data = page<TestCase>([
      { id: 10, name: 'Login test', projectId: 1, status: { name: 'Active' }, testLayer: { name: 'UI' }, automated: true, tags: [{ name: 'smoke' }] },
    ], 1);
    const out = formatTestCases(data);
    expect(out).toContain('[#10] Login test');
    expect(out).toContain('Status: Active');
    expect(out).toContain('Automated: Yes');
    expect(out).toContain('Tags: smoke');
  });

  it('handles missing status/layer/tags', () => {
    const data = page<TestCase>([
      { id: 1, name: 'TC', projectId: 1 },
    ], 1);
    const out = formatTestCases(data);
    expect(out).toContain('Status: N/A');
    expect(out).toContain('Automated: N/A');
  });
});

describe('formatTestCase', () => {
  it('formats a full test case', () => {
    const tc: TestCase = {
      id: 7, name: 'Checkout', projectId: 2,
      status: { name: 'Draft' }, testLayer: { name: 'API' }, automated: false,
      tags: [{ name: 'regression' }], description: 'desc', precondition: 'logged in',
      expectedResult: 'order created', fullName: 'Suite / Checkout', duration: 500,
      createdDate: 1700000000000, createdBy: 'alice',
      lastModifiedDate: 1700000001000, lastModifiedBy: 'bob',
      links: [{ name: 'Jira', url: 'https://jira/1' }],
    };
    const out = formatTestCase(tc);
    expect(out).toContain('Test Case #7: Checkout');
    expect(out).toContain('Status: Draft');
    expect(out).toContain('Layer: API');
    expect(out).toContain('Automated: No');
    expect(out).toContain('Tags: regression');
    expect(out).toContain('Description: desc');
    expect(out).toContain('Precondition: logged in');
    expect(out).toContain('Expected Result: order created');
    expect(out).toContain('Full Name: Suite / Checkout');
    expect(out).toContain('Duration: 500ms');
    expect(out).toContain('Jira (https://jira/1)');
    expect(out).toContain('alice');
  });

  it('handles minimal test case', () => {
    const out = formatTestCase({ id: 1, name: 'Min', projectId: 1 });
    expect(out).toContain('Test Case #1: Min');
    expect(out).toContain('Tags: none');
    expect(out).toContain('Created: N/A by N/A');
    expect(out).not.toContain('Description:');
  });
});

describe('formatTestCaseOverview', () => {
  it('formats overview with sub-resources', () => {
    const tc: TestCaseOverview = {
      id: 1, name: 'Overview TC', projectId: 1,
      members: [{ id: 10, name: 'Alice', role: { name: 'Tester' } }],
      issues: [{ displayName: 'BUG-1', url: 'https://bug/1', closed: true }],
      customFields: [{ id: 1, name: 'High', customField: { id: 100, name: 'Priority' } }],
      requirements: [{ displayName: 'REQ-1', url: 'https://req/1' }],
      testKeys: [{ name: 'KEY-1', url: 'https://key/1' }],
    };
    const out = formatTestCaseOverview(tc);
    expect(out).toContain('Members:');
    expect(out).toContain('Alice (Tester)');
    expect(out).toContain('Issue Links:');
    expect(out).toContain('BUG-1');
    expect(out).toContain('[closed]');
    expect(out).toContain('Custom Fields:');
    expect(out).toContain('Priority');
    expect(out).toContain('Requirements:');
    expect(out).toContain('REQ-1');
    expect(out).toContain('Test Keys:');
    expect(out).toContain('KEY-1');
  });

  it('omits sections when sub-resources are empty', () => {
    const tc: TestCaseOverview = { id: 1, name: 'Simple', projectId: 1 };
    const out = formatTestCaseOverview(tc);
    expect(out).not.toContain('Members:');
    expect(out).not.toContain('Issue Links:');
  });
});

// ── Issues, Members, CustomFields, Relations, Requirements, TestKeys, ExternalLinks ──

describe('formatIssues', () => {
  it('returns fallback for empty list', () => {
    expect(formatIssues([])).toBe('No issue links.');
  });

  it('formats issues', () => {
    const out = formatIssues([
      { displayName: 'BUG-1', url: 'https://b/1', closed: false },
      { name: 'issue2', closed: true },
    ]);
    expect(out).toContain('2 issue link(s)');
    expect(out).toContain('BUG-1 (https://b/1)');
    expect(out).toContain('[closed]');
  });
});

describe('formatMembers', () => {
  it('returns fallback for empty list', () => {
    expect(formatMembers([])).toBe('No members.');
  });

  it('formats members', () => {
    const out = formatMembers([{ id: 1, name: 'Bob', role: { name: 'Lead' } }]);
    expect(out).toContain('1 member(s)');
    expect(out).toContain('Bob — Lead');
  });

  it('uses fallback for missing name', () => {
    const out = formatMembers([{ id: 5 }]);
    expect(out).toContain('User #5');
  });
});

describe('formatCustomFields', () => {
  it('returns fallback for empty list', () => {
    expect(formatCustomFields([])).toBe('No custom fields.');
  });

  it('groups values by custom field', () => {
    const fields: CustomFieldValueWithCf[] = [
      { id: 1, name: 'High', customField: { id: 10, name: 'Priority' } },
      { id: 2, name: 'Low', customField: { id: 10, name: 'Priority' } },
    ];
    const out = formatCustomFields(fields);
    expect(out).toContain('1 custom field(s)');
    expect(out).toContain('Priority');
    expect(out).toContain('High');
    expect(out).toContain('Low');
  });

  it('skips entries without customField.id', () => {
    const out = formatCustomFields([{ id: 1, name: 'val' }]);
    expect(out).toContain('0 custom field(s)');
  });
});

describe('formatRelations', () => {
  it('returns fallback for empty list', () => {
    expect(formatRelations([])).toBe('No relations.');
  });

  it('formats relations', () => {
    const out = formatRelations([
      { id: 1, type: 'related to', target: { id: 5, name: 'Other TC' } },
    ]);
    expect(out).toContain('1 relation(s)');
    expect(out).toContain('[related to]');
    expect(out).toContain('Other TC');
  });
});

describe('formatRequirements', () => {
  it('returns fallback for empty list', () => {
    expect(formatRequirements([])).toBe('No requirements.');
  });

  it('formats requirements', () => {
    const out = formatRequirements([{ displayName: 'REQ-1', url: 'https://r/1' }]);
    expect(out).toContain('1 requirement(s)');
    expect(out).toContain('REQ-1 (https://r/1)');
  });
});

describe('formatTestKeys', () => {
  it('returns fallback for empty list', () => {
    expect(formatTestKeys([])).toBe('No test keys.');
  });

  it('formats test keys', () => {
    const out = formatTestKeys([{ name: 'K-1', url: 'https://k/1' }]);
    expect(out).toContain('1 test key(s)');
    expect(out).toContain('K-1 (https://k/1)');
  });

  it('omits url when missing', () => {
    const out = formatTestKeys([{ name: 'K-2' }]);
    expect(out).toContain('  - K-2');
    expect(out).not.toContain('K-2 (');
  });
});

describe('formatExternalLinks', () => {
  it('returns fallback for empty list', () => {
    expect(formatExternalLinks([])).toBe('No links.');
  });

  it('formats links with type', () => {
    const out = formatExternalLinks([{ name: 'Doc', url: 'https://d', type: 'wiki' }]);
    expect(out).toContain('1 link(s)');
    expect(out).toContain('Doc (https://d) [wiki]');
  });

  it('handles missing name and url', () => {
    const out = formatExternalLinks([{}]);
    expect(out).toContain('link (N/A)');
  });
});

// ── Scenario ─────────────────────────────────────────────

describe('formatScenario', () => {
  it('returns fallback for empty steps', () => {
    expect(formatScenario({ steps: [] })).toBe('No steps defined.');
  });

  it('formats steps with keywords and expected results', () => {
    const scenario: TestCaseScenario = {
      steps: [
        { name: 'Open page', keyword: 'Given', expectedResult: 'Page loads' },
        { name: 'Click button', keyword: 'When' },
      ],
    };
    const out = formatScenario(scenario);
    expect(out).toContain('Scenario steps:');
    expect(out).toContain('[Given] Open page');
    expect(out).toContain('→ Expected: Page loads');
    expect(out).toContain('[When] Click button');
  });

  it('formats nested steps', () => {
    const scenario: TestCaseScenario = {
      steps: [
        { name: 'Parent', steps: [{ name: 'Child' }] },
      ],
    };
    const out = formatScenario(scenario);
    expect(out).toContain('Parent');
    expect(out).toContain('Child');
  });
});

// ── Test Plans ───────────────────────────────────────────

describe('formatTestPlans', () => {
  it('returns fallback for empty list', () => {
    expect(formatTestPlans(page([]))).toBe('No test plans found.');
  });

  it('formats test plans', () => {
    const data = page<TestPlan>([
      { id: 1, name: 'Sprint 1', projectId: 1, status: 'Active' },
    ], 1);
    const out = formatTestPlans(data);
    expect(out).toContain('[#1] Sprint 1');
    expect(out).toContain('Status: Active');
  });

  it('handles missing status', () => {
    const data = page<TestPlan>([{ id: 1, name: 'TP', projectId: 1 }], 1);
    const out = formatTestPlans(data);
    expect(out).toContain('Status: N/A');
  });
});

describe('formatTestPlan', () => {
  it('formats a test plan', () => {
    const out = formatTestPlan({
      id: 3, name: 'Plan', projectId: 1, status: 'Draft',
      description: 'A plan', createdDate: 1700000000000, createdBy: 'eve',
    });
    expect(out).toContain('Test Plan #3: Plan');
    expect(out).toContain('Status: Draft');
    expect(out).toContain('Description: A plan');
    expect(out).toContain('eve');
  });

  it('omits optional fields when missing', () => {
    const out = formatTestPlan({ id: 1, name: 'TP', projectId: 1 });
    expect(out).not.toContain('Description:');
    expect(out).toContain('Status: N/A');
  });
});

// ── Launches ─────────────────────────────────────────────

describe('formatLaunches', () => {
  it('returns fallback for empty list', () => {
    expect(formatLaunches(page([]))).toBe('No launches found.');
  });

  it('formats launches with statistics', () => {
    const data = page<Launch>([
      {
        id: 1, name: 'Run 1', closed: false,
        statistic: [{ status: 'passed', count: 5 }, { status: 'failed', count: 2 }],
      },
    ], 1);
    const out = formatLaunches(data);
    expect(out).toContain('[#1] Run 1');
    expect(out).toContain('Open');
    expect(out).toContain('P:5');
    expect(out).toContain('F:2');
  });
});

describe('formatLaunch', () => {
  it('formats a launch', () => {
    const out = formatLaunch({
      id: 10, name: 'Nightly', projectId: 1, closed: true,
      createdDate: 1700000000000, createdBy: 'ci',
      statistic: [{ status: 'passed', count: 10 }],
    });
    expect(out).toContain('Launch #10: Nightly');
    expect(out).toContain('Closed');
    expect(out).toContain('P:10');
    expect(out).toContain('ci');
  });

  it('handles minimal launch', () => {
    const out = formatLaunch({ id: 1, name: 'L' });
    expect(out).toContain('Launch #1: L');
    expect(out).toContain('Open');
  });
});

// ── Test Results ─────────────────────────────────────────

describe('formatTestResults', () => {
  it('returns fallback for empty list', () => {
    expect(formatTestResults(page([]))).toBe('No test results found.');
  });

  it('formats test results', () => {
    const data = page<TestResult>([
      { id: 1, name: 'TC-1', status: 'passed', duration: 150 },
    ], 1);
    const out = formatTestResults(data);
    expect(out).toContain('[#1] TC-1');
    expect(out).toContain('Status: passed');
    expect(out).toContain('Duration: 150ms');
  });

  it('handles missing status and duration', () => {
    const data = page<TestResult>([{ id: 1, name: 'TR' }], 1);
    const out = formatTestResults(data);
    expect(out).toContain('Status: pending');
    expect(out).not.toContain('Duration:');
  });
});

describe('formatTestResult', () => {
  it('formats a full test result', () => {
    const out = formatTestResult({
      id: 5, name: 'Login test', status: 'failed',
      testCaseId: 10, launchId: 3, duration: 2000,
      assignee: 'alice', manual: true,
      message: 'Assertion failed', trace: 'at line 42',
      createdDate: 1700000000000,
    });
    expect(out).toContain('Test Result #5: Login test');
    expect(out).toContain('Status: failed');
    expect(out).toContain('Test Case: #10');
    expect(out).toContain('Launch: #3');
    expect(out).toContain('Duration: 2000ms');
    expect(out).toContain('Assignee: alice');
    expect(out).toContain('Manual: Yes');
    expect(out).toContain('Message: Assertion failed');
    expect(out).toContain('Trace: at line 42');
  });

  it('handles minimal test result', () => {
    const out = formatTestResult({ id: 1, name: 'TR' });
    expect(out).toContain('Status: pending');
    expect(out).not.toContain('Assignee:');
    expect(out).not.toContain('Duration:');
  });
});

// ── Defects ──────────────────────────────────────────────

describe('formatDefects', () => {
  it('returns fallback for empty list', () => {
    expect(formatDefects(page([]))).toBe('No defects found.');
  });

  it('formats defects', () => {
    const data = page<Defect>([
      { id: 1, name: 'Bug A', projectId: 1, status: 'Open' },
    ], 1);
    const out = formatDefects(data);
    expect(out).toContain('[#1] Bug A');
    expect(out).toContain('Status: Open');
  });
});

describe('formatDefect', () => {
  it('formats a defect with all fields', () => {
    const out = formatDefect({
      id: 3, name: 'Crash', projectId: 1, status: 'Closed',
      description: 'App crashes', createdDate: 1700000000000,
      createdBy: 'bob', closedDate: 1700001000000,
    });
    expect(out).toContain('Defect #3: Crash');
    expect(out).toContain('Status: Closed');
    expect(out).toContain('Description: App crashes');
    expect(out).toContain('Closed:');
  });

  it('handles missing optional fields', () => {
    const out = formatDefect({ id: 1, name: 'D', projectId: 1 });
    expect(out).toContain('Status: N/A');
    expect(out).not.toContain('Description:');
    expect(out).not.toContain('Closed:');
  });
});

// ── Analytics ────────────────────────────────────────────

describe('formatAutomationTrend', () => {
  it('returns fallback for empty data', () => {
    expect(formatAutomationTrend([])).toBe('No automation trend data.');
  });

  it('formats trend points with percentage', () => {
    const data: AutomationTrendPoint[] = [
      { date: '2024-01-01', automatedCount: 3, manualCount: 7 },
    ];
    const out = formatAutomationTrend(data);
    expect(out).toContain('Automation Trend:');
    expect(out).toContain('3/10 automated (30.0%)');
  });

  it('handles zero total', () => {
    const data: AutomationTrendPoint[] = [
      { date: '2024-01-01', automatedCount: 0, manualCount: 0 },
    ];
    const out = formatAutomationTrend(data);
    expect(out).toContain('0/0 automated (0.0%)');
  });
});

describe('formatStatusDistribution', () => {
  it('returns fallback for empty data', () => {
    expect(formatStatusDistribution([])).toBe('No status distribution data.');
  });

  it('formats distribution with percentages', () => {
    const data: StatusDistribution[] = [
      { statusName: 'Passed', statusId: 1, count: 8 },
      { statusName: 'Failed', statusId: 2, count: 2 },
    ];
    const out = formatStatusDistribution(data);
    expect(out).toContain('total: 10');
    expect(out).toContain('Passed: 8 (80.0%)');
    expect(out).toContain('Failed: 2 (20.0%)');
  });
});

describe('formatSuccessRate', () => {
  it('returns fallback for empty data', () => {
    expect(formatSuccessRate([])).toBe('No success rate data.');
  });

  it('formats success rate points', () => {
    const data: SuccessRatePoint[] = [
      { date: '2024-01-01', avgSuccessRate: 85.5, testResultsCount: 100, testCasesCount: 50 },
    ];
    const out = formatSuccessRate(data);
    expect(out).toContain('Success Rate Trend:');
    expect(out).toContain('85.5%');
    expect(out).toContain('100 results / 50 cases');
  });
});

// ── Test Layers & Workflows ──────────────────────────────

describe('formatTestLayers', () => {
  it('returns fallback for empty list', () => {
    expect(formatTestLayers(page([]))).toBe('No test layers found.');
  });

  it('formats test layers', () => {
    const data = page<TestLayer>([{ id: 1, name: 'Unit' }, { id: 2, name: 'Integration' }], 2);
    const out = formatTestLayers(data);
    expect(out).toContain('2 test layer(s)');
    expect(out).toContain('[id: 1] Unit');
    expect(out).toContain('[id: 2] Integration');
  });
});

describe('formatWorkflows', () => {
  it('returns fallback for empty list', () => {
    expect(formatWorkflows(page([]))).toBe('No workflows found.');
  });

  it('formats workflows with statuses', () => {
    const data = page<Workflow>([
      { id: 1, name: 'Default WF', statuses: [{ id: 10, name: 'Open' }, { id: 11, name: 'Done' }] },
    ], 1);
    const out = formatWorkflows(data);
    expect(out).toContain('1 workflow(s)');
    expect(out).toContain('[id: 1] Default WF');
    expect(out).toContain('Open (id: 10)');
    expect(out).toContain('Done (id: 11)');
  });

  it('handles workflow with no statuses', () => {
    const data = page<Workflow>([{ id: 1, name: 'WF' }], 1);
    const out = formatWorkflows(data);
    expect(out).toContain('Statuses: none');
  });
});
