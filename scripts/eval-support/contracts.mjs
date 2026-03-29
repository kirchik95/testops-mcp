export const apiContracts = [
  { group: 'projects', method: 'GET', path: '/api/project' },
  { group: 'projects', method: 'GET', path: '/api/project/:id' },
  { group: 'test-cases', method: 'GET', path: '/api/testcase' },
  { group: 'test-cases', method: 'GET', path: '/api/testcase/search' },
  { group: 'test-cases', method: 'GET', path: '/api/testcase/:id' },
  { group: 'test-cases', method: 'GET', path: '/api/testcase/:id/overview' },
  { group: 'test-cases', method: 'POST', path: '/api/testcase' },
  { group: 'test-cases', method: 'PATCH', path: '/api/testcase/:id' },
  { group: 'test-cases', method: 'DELETE', path: '/api/testcase/:id' },
  { group: 'test-cases', method: 'GET', path: '/api/testcase/:id/scenario' },
  { group: 'test-cases', method: 'POST', path: '/api/testcase/:id/scenario' },
  { group: 'test-cases', method: 'GET', path: '/api/testcase/:id/issue' },
  { group: 'test-cases', method: 'POST', path: '/api/testcase/:id/issue' },
  { group: 'test-cases', method: 'GET', path: '/api/testcase/:id/members' },
  { group: 'test-cases', method: 'POST', path: '/api/testcase/:id/members' },
  { group: 'test-cases', method: 'GET', path: '/api/testcase/:id/cfv' },
  { group: 'test-cases', method: 'POST', path: '/api/testcase/:id/cfv' },
  { group: 'test-cases', method: 'GET', path: '/api/testcase/:id/relation' },
  { group: 'test-cases', method: 'POST', path: '/api/testcase/:id/relation' },
  { group: 'test-cases', method: 'GET', path: '/api/testcase/:id/requirement' },
  { group: 'test-cases', method: 'POST', path: '/api/testcase/:id/requirement' },
  { group: 'test-cases', method: 'GET', path: '/api/testcase/:id/testkey' },
  { group: 'test-cases', method: 'POST', path: '/api/testcase/:id/testkey' },
  { group: 'test-plans', method: 'GET', path: '/api/testplan' },
  { group: 'test-plans', method: 'GET', path: '/api/testplan/:id' },
  { group: 'test-plans', method: 'POST', path: '/api/testplan' },
  { group: 'test-plans', method: 'PATCH', path: '/api/testplan/:id' },
  { group: 'test-plans', method: 'GET', path: '/api/testplan/:id/testcase' },
  { group: 'launches', method: 'GET', path: '/api/launch' },
  { group: 'launches', method: 'GET', path: '/api/launch/:id' },
  { group: 'launches', method: 'GET', path: '/api/launch/:id/statistic' },
  { group: 'test-results', method: 'GET', path: '/api/testresult' },
  { group: 'test-results', method: 'GET', path: '/api/testresult/:id' },
  { group: 'test-results', method: 'PATCH', path: '/api/testresult/:id' },
  { group: 'defects', method: 'GET', path: '/api/defect' },
  { group: 'defects', method: 'GET', path: '/api/defect/:id' },
  { group: 'defects', method: 'POST', path: '/api/defect' },
  { group: 'defects', method: 'PATCH', path: '/api/defect/:id' },
  { group: 'analytics', method: 'GET', path: '/api/analytic/:id/automation_chart' },
  { group: 'analytics', method: 'GET', path: '/api/analytic/:id/group_by_status' },
  { group: 'analytics', method: 'GET', path: '/api/analytic/:id/tc_success_rate' },
  { group: 'reference-data', method: 'GET', path: '/api/testlayer' },
  { group: 'reference-data', method: 'GET', path: '/api/workflow' },
];

export function contractSignature(contract) {
  return `${contract.method} ${contract.path}`;
}

export function normalizePathTemplate(rawPath) {
  return rawPath.replace(/\$\{[^}]+\}/g, ':id');
}
