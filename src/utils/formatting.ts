import { Project, TestCase, TestPlan, Launch, TestResult, Defect, AutomationTrendPoint, StatusDistribution, SuccessRatePoint, TestCaseScenario, TestCaseStep } from '../types/api-types.js';
import { PageResponse } from '../types/common.js';

function formatDate(timestamp?: number): string {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toISOString().replace('T', ' ').substring(0, 19);
}

function boolLabel(val?: boolean): string {
  return val === true ? 'Yes' : val === false ? 'No' : 'N/A';
}

export function formatProjects(data: PageResponse<Project>): string {
  if (data.content.length === 0) return 'No projects found.';
  const lines = [`Found ${data.totalElements} project(s) (page ${data.number + 1} of ${data.totalPages}):\n`];
  for (const p of data.content) {
    lines.push(`- [#${p.id}] ${p.name} (${p.isPublic ? 'Public' : 'Private'})`);
  }
  return lines.join('\n');
}

export function formatProject(p: Project): string {
  return [
    `Project #${p.id}: ${p.name}`,
    `  Public: ${p.isPublic ? 'Yes' : 'No'}`,
    p.createdDate ? `  Created: ${formatDate(p.createdDate)}` : null,
    p.lastModifiedDate ? `  Modified: ${formatDate(p.lastModifiedDate)}` : null,
  ].filter(Boolean).join('\n');
}

export function formatTestCases(data: PageResponse<TestCase>): string {
  if (data.content.length === 0) return 'No test cases found.';
  const lines = [`Found ${data.totalElements} test case(s) (page ${data.number + 1} of ${data.totalPages}):\n`];
  for (const tc of data.content) {
    const tags = tc.tags?.map(t => t.name).join(', ') || '';
    lines.push(`${tc.id}. [#${tc.id}] ${tc.name}`);
    lines.push(`   Status: ${tc.status || 'N/A'} | Layer: ${tc.layer || 'N/A'} | Automated: ${boolLabel(tc.automated)}${tags ? ` | Tags: ${tags}` : ''}`);
  }
  return lines.join('\n');
}

export function formatTestCase(tc: TestCase): string {
  const tags = tc.tags?.map(t => t.name).join(', ') || 'none';
  return [
    `Test Case #${tc.id}: ${tc.name}`,
    `  Project: ${tc.projectId}`,
    `  Status: ${tc.status || 'N/A'}`,
    `  Layer: ${tc.layer || 'N/A'}`,
    `  Automated: ${boolLabel(tc.automated)}`,
    `  Tags: ${tags}`,
    tc.description ? `  Description: ${tc.description}` : null,
    tc.precondition ? `  Precondition: ${tc.precondition}` : null,
    tc.expectedResult ? `  Expected Result: ${tc.expectedResult}` : null,
    `  Created: ${formatDate(tc.createdDate)} by ${tc.createdBy || 'N/A'}`,
    `  Modified: ${formatDate(tc.lastModifiedDate)} by ${tc.lastModifiedBy || 'N/A'}`,
  ].filter(Boolean).join('\n');
}

export function formatScenario(scenario: TestCaseScenario): string {
  if (!scenario.steps || scenario.steps.length === 0) return 'No steps defined.';
  const lines = ['Scenario steps:'];
  function renderSteps(steps: TestCaseStep[], indent = 1) {
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const prefix = '  '.repeat(indent);
      const keyword = s.keyword ? `[${s.keyword}] ` : '';
      lines.push(`${prefix}${i + 1}. ${keyword}${s.name}`);
      if (s.expectedResult) lines.push(`${prefix}   → Expected: ${s.expectedResult}`);
      if (s.steps && s.steps.length > 0) renderSteps(s.steps, indent + 1);
    }
  }
  renderSteps(scenario.steps);
  return lines.join('\n');
}

export function formatTestPlans(data: PageResponse<TestPlan>): string {
  if (data.content.length === 0) return 'No test plans found.';
  const lines = [`Found ${data.totalElements} test plan(s) (page ${data.number + 1} of ${data.totalPages}):\n`];
  for (const tp of data.content) {
    lines.push(`- [#${tp.id}] ${tp.name} | Status: ${tp.status || 'N/A'}`);
  }
  return lines.join('\n');
}

export function formatTestPlan(tp: TestPlan): string {
  return [
    `Test Plan #${tp.id}: ${tp.name}`,
    `  Project: ${tp.projectId}`,
    `  Status: ${tp.status || 'N/A'}`,
    tp.description ? `  Description: ${tp.description}` : null,
    `  Created: ${formatDate(tp.createdDate)} by ${tp.createdBy || 'N/A'}`,
  ].filter(Boolean).join('\n');
}

export function formatLaunches(data: PageResponse<Launch>): string {
  if (data.content.length === 0) return 'No launches found.';
  const lines = [`Found ${data.totalElements} launch(es) (page ${data.number + 1} of ${data.totalPages}):\n`];
  for (const l of data.content) {
    const stat = l.statistic;
    const statLine = stat ? ` | P:${stat.passed} F:${stat.failed} B:${stat.broken} S:${stat.skipped}` : '';
    lines.push(`- [#${l.id}] ${l.name} | Status: ${l.status || 'N/A'}${statLine}`);
  }
  return lines.join('\n');
}

export function formatLaunch(l: Launch): string {
  const stat = l.statistic;
  return [
    `Launch #${l.id}: ${l.name}`,
    `  Project: ${l.projectId}`,
    `  Status: ${l.status || 'N/A'}`,
    `  Created: ${formatDate(l.createdDate)}`,
    l.closedDate ? `  Closed: ${formatDate(l.closedDate)}` : null,
    stat ? `  Statistics: Total: ${stat.total} | Passed: ${stat.passed} | Failed: ${stat.failed} | Broken: ${stat.broken} | Skipped: ${stat.skipped} | Unknown: ${stat.unknown}` : null,
  ].filter(Boolean).join('\n');
}

export function formatTestResults(data: PageResponse<TestResult>): string {
  if (data.content.length === 0) return 'No test results found.';
  const lines = [`Found ${data.totalElements} test result(s) (page ${data.number + 1} of ${data.totalPages}):\n`];
  for (const tr of data.content) {
    lines.push(`- [#${tr.id}] ${tr.name} | Status: ${tr.status}${tr.duration ? ` | Duration: ${tr.duration}ms` : ''}`);
  }
  return lines.join('\n');
}

export function formatTestResult(tr: TestResult): string {
  return [
    `Test Result #${tr.id}: ${tr.name}`,
    `  Status: ${tr.status}`,
    tr.testCaseId ? `  Test Case: #${tr.testCaseId}` : null,
    tr.launchId ? `  Launch: #${tr.launchId}` : null,
    tr.duration ? `  Duration: ${tr.duration}ms` : null,
    tr.message ? `  Message: ${tr.message}` : null,
    tr.trace ? `  Trace: ${tr.trace.substring(0, 500)}${tr.trace.length > 500 ? '...' : ''}` : null,
    `  Created: ${formatDate(tr.createdDate)}`,
  ].filter(Boolean).join('\n');
}

export function formatDefects(data: PageResponse<Defect>): string {
  if (data.content.length === 0) return 'No defects found.';
  const lines = [`Found ${data.totalElements} defect(s) (page ${data.number + 1} of ${data.totalPages}):\n`];
  for (const d of data.content) {
    lines.push(`- [#${d.id}] ${d.name} | Status: ${d.status || 'N/A'}`);
  }
  return lines.join('\n');
}

export function formatDefect(d: Defect): string {
  return [
    `Defect #${d.id}: ${d.name}`,
    `  Project: ${d.projectId}`,
    `  Status: ${d.status || 'N/A'}`,
    d.description ? `  Description: ${d.description}` : null,
    `  Created: ${formatDate(d.createdDate)} by ${d.createdBy || 'N/A'}`,
    d.closedDate ? `  Closed: ${formatDate(d.closedDate)}` : null,
  ].filter(Boolean).join('\n');
}

export function formatAutomationTrend(data: AutomationTrendPoint[]): string {
  if (data.length === 0) return 'No automation trend data.';
  const lines = ['Automation Trend:\n'];
  for (const p of data) {
    const pct = p.total > 0 ? ((p.automated / p.total) * 100).toFixed(1) : '0.0';
    lines.push(`  ${formatDate(p.date)}: ${p.automated}/${p.total} automated (${pct}%)`);
  }
  return lines.join('\n');
}

export function formatStatusDistribution(data: StatusDistribution[]): string {
  if (data.length === 0) return 'No status distribution data.';
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const lines = [`Status Distribution (total: ${total}):\n`];
  for (const d of data) {
    const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0.0';
    lines.push(`  ${d.status}: ${d.count} (${pct}%)`);
  }
  return lines.join('\n');
}

export function formatSuccessRate(data: SuccessRatePoint[]): string {
  if (data.length === 0) return 'No success rate data.';
  const lines = ['Success Rate Trend:\n'];
  for (const p of data) {
    lines.push(`  ${formatDate(p.date)}: ${p.successRate.toFixed(1)}% (${p.passed}/${p.total})`);
  }
  return lines.join('\n');
}
