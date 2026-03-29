function nowIso() {
  return new Date('2026-03-31T10:00:00.000Z').toISOString();
}

export function createEvalFixtures() {
  return {
    projects: [
      { id: 1, name: 'Smoke Project', isPublic: false, createdDate: 1711879200000 },
    ],
    testCases: [
      {
        id: 11,
        name: 'Existing Smoke Case',
        projectId: 1,
        status: { id: 101, name: 'Active' },
        testLayer: { id: 201, name: 'API' },
        automated: true,
        tags: [{ name: 'smoke' }],
        description: 'Existing scenario',
        createdDate: 1711879200000,
        lastModifiedDate: 1711879200000,
        createdBy: 'robot',
        lastModifiedBy: 'robot',
      },
    ],
    testCaseScenarios: {
      11: {
        steps: [
          { keyword: 'Given', name: 'Service is healthy' },
          { keyword: 'When', name: 'API request is sent' },
          { keyword: 'Then', name: 'HTTP 200 is returned', expectedResult: 'Status code is 200' },
        ],
      },
    },
    testCaseMembers: {
      11: [{ id: 500, name: 'QA Robot', role: { id: 1, name: 'Owner' } }],
    },
    testCaseIssues: {
      11: [{ name: 'QA-1', displayName: 'QA-1', url: 'https://tracker.example.com/QA-1', integrationId: 44 }],
    },
    testCaseCustomFields: {
      11: [{ id: 700, name: 'Backend', customField: { id: 9, name: 'Component' } }],
    },
    testCaseRelations: {
      11: [{ type: 'RELATED_TO', target: { id: 12, name: 'Regression dependency' } }],
    },
    testCaseRequirements: {
      11: [{ name: 'REQ-42', displayName: 'REQ-42', url: 'https://requirements.example.com/REQ-42' }],
    },
    testCaseTestKeys: {
      11: [{ name: 'AUTO-11', url: 'https://ci.example.com/AUTO-11' }],
    },
    testPlans: [
      { id: 21, name: 'Regression Plan', projectId: 1, description: 'Nightly plan', status: 'Active', createdBy: 'robot', createdDate: 1711879200000 },
    ],
    testPlanTestCaseIds: {
      21: [11],
    },
    launches: [
      {
        id: 31,
        name: 'Release Launch',
        projectId: 1,
        closed: false,
        createdDate: 1711879200000,
        createdBy: 'robot',
        statistic: [
          { status: 'passed', count: 3 },
          { status: 'failed', count: 1 },
        ],
      },
    ],
    testResults: [
      {
        id: 41,
        name: 'Checkout flow result',
        status: 'passed',
        launchId: 31,
        testCaseId: 11,
        projectId: 1,
        duration: 3200,
        createdDate: 1711879200000,
        message: 'All good',
      },
    ],
    defects: [
      {
        id: 51,
        name: 'Payment defect',
        projectId: 1,
        status: 'Open',
        description: 'Intermittent payment issue',
        createdDate: 1711879200000,
        createdBy: 'robot',
      },
    ],
    analytics: {
      automationTrend: [
        { date: nowIso(), automatedCount: 8, manualCount: 2 },
      ],
      statusDistribution: [
        { statusName: 'Active', statusId: 101, count: 8 },
        { statusName: 'Draft', statusId: 102, count: 2 },
      ],
      successRate: [
        { date: nowIso(), avgSuccessRate: 91.4, testResultsCount: 11, testCasesCount: 10 },
      ],
    },
    testLayers: [
      { id: 201, name: 'API' },
      { id: 202, name: 'UI' },
    ],
    workflows: [
      { id: 301, name: 'Default Workflow', statuses: [{ id: 101, name: 'Active' }, { id: 102, name: 'Draft' }] },
    ],
  };
}
