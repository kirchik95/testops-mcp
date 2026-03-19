import {
  Project, TestCase, TestCaseOverview, TestPlan, Launch, TestResult, Defect,
  AutomationTrendPoint, StatusDistribution, SuccessRatePoint,
  TestCaseScenario, TestCaseStep, TestStatusCount,
  IssueDto, MemberDto, CustomFieldValueWithCf,
  TestCaseRelationDto, RequirementDto, TestKeyDto,
  TestLayer, Workflow,
} from '../types/api-types.js';
import { PageResponse } from '../types/common.js';

function formatDate(dateOrTimestamp?: number | string): string {
  if (dateOrTimestamp === undefined || dateOrTimestamp === null) return 'N/A';
  const d = typeof dateOrTimestamp === 'string' ? new Date(dateOrTimestamp) : new Date(dateOrTimestamp);
  if (isNaN(d.getTime())) return String(dateOrTimestamp);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

function boolLabel(val?: boolean): string {
  return val === true ? 'Yes' : val === false ? 'No' : 'N/A';
}

function formatStatistic(statistic?: TestStatusCount[]): string {
  if (!statistic || statistic.length === 0) return '';
  const map: Record<string, number> = {};
  for (const s of statistic) {
    map[s.status] = s.count;
  }
  const parts = [
    `P:${map['passed'] ?? 0}`,
    `F:${map['failed'] ?? 0}`,
    `B:${map['broken'] ?? 0}`,
    `S:${map['skipped'] ?? 0}`,
  ];
  if (map['unknown']) parts.push(`U:${map['unknown']}`);
  if (map['in_progress']) parts.push(`IP:${map['in_progress']}`);
  return parts.join(' ');
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

function statusName(s?: { name?: string } | string): string {
  if (!s) return 'N/A';
  if (typeof s === 'string') return s;
  return s.name || 'N/A';
}

export function formatTestCases(data: PageResponse<TestCase>): string {
  if (data.content.length === 0) return 'No test cases found.';
  const lines = [`Found ${data.totalElements} test case(s) (page ${data.number + 1} of ${data.totalPages}):\n`];
  for (const tc of data.content) {
    const tags = tc.tags?.map(t => t.name).join(', ') || '';
    lines.push(`${tc.id}. [#${tc.id}] ${tc.name}`);
    lines.push(`   Status: ${statusName(tc.status)} | Layer: ${statusName(tc.testLayer)} | Automated: ${boolLabel(tc.automated)}${tags ? ` | Tags: ${tags}` : ''}`);
  }
  return lines.join('\n');
}

export function formatTestCase(tc: TestCase): string {
  const tags = tc.tags?.map(t => t.name).join(', ') || 'none';
  const links = tc.links && tc.links.length > 0
    ? tc.links.map(l => `    - ${l.name || l.url || 'link'} (${l.url || 'N/A'})`).join('\n')
    : null;
  return [
    `Test Case #${tc.id}: ${tc.name}`,
    `  Project: ${tc.projectId}`,
    `  Status: ${statusName(tc.status)}`,
    `  Layer: ${statusName(tc.testLayer)}`,
    `  Automated: ${boolLabel(tc.automated)}`,
    `  Tags: ${tags}`,
    tc.fullName ? `  Full Name: ${tc.fullName}` : null,
    tc.duration ? `  Duration: ${tc.duration}ms` : null,
    tc.description ? `  Description: ${tc.description}` : null,
    tc.precondition ? `  Precondition: ${tc.precondition}` : null,
    tc.expectedResult ? `  Expected Result: ${tc.expectedResult}` : null,
    links ? `  Links:\n${links}` : null,
    `  Created: ${formatDate(tc.createdDate)} by ${tc.createdBy || 'N/A'}`,
    `  Modified: ${formatDate(tc.lastModifiedDate)} by ${tc.lastModifiedBy || 'N/A'}`,
  ].filter(Boolean).join('\n');
}

export function formatTestCaseOverview(tc: TestCaseOverview): string {
  const base = formatTestCase(tc);
  const sections: string[] = [base];

  if (tc.members && tc.members.length > 0) {
    sections.push('  Members:');
    for (const m of tc.members) {
      sections.push(`    - ${m.name || `User #${m.id}`} (${m.role?.name || 'N/A'})`);
    }
  }

  if (tc.issues && tc.issues.length > 0) {
    sections.push('  Issue Links:');
    for (const i of tc.issues) {
      sections.push(`    - ${i.displayName || i.name || 'issue'} (${i.url || 'N/A'})${i.closed ? ' [closed]' : ''}`);
    }
  }

  if (tc.customFields && tc.customFields.length > 0) {
    sections.push('  Custom Fields:');
    for (const cf of tc.customFields) {
      sections.push(`    - ${cf.customField?.name || 'field'}: ${cf.name || 'N/A'}`);
    }
  }

  if (tc.requirements && tc.requirements.length > 0) {
    sections.push('  Requirements:');
    for (const r of tc.requirements) {
      sections.push(`    - ${r.displayName || r.name || 'req'} (${r.url || 'N/A'})`);
    }
  }

  if (tc.testKeys && tc.testKeys.length > 0) {
    sections.push('  Test Keys:');
    for (const tk of tc.testKeys) {
      sections.push(`    - ${tk.name}${tk.url ? ` (${tk.url})` : ''}`);
    }
  }

  return sections.join('\n');
}

export function formatIssues(issues: IssueDto[]): string {
  if (issues.length === 0) return 'No issue links.';
  const lines = [`${issues.length} issue link(s):\n`];
  for (const i of issues) {
    lines.push(`  - ${i.displayName || i.name || 'issue'}${i.url ? ` (${i.url})` : ''}${i.closed ? ' [closed]' : ''}`);
  }
  return lines.join('\n');
}

export function formatMembers(members: MemberDto[]): string {
  if (members.length === 0) return 'No members.';
  const lines = [`${members.length} member(s):\n`];
  for (const m of members) {
    lines.push(`  - ${m.name || `User #${m.id}`} — ${m.role?.name || 'N/A'}`);
  }
  return lines.join('\n');
}

export function formatCustomFields(fields: CustomFieldValueWithCf[]): string {
  if (fields.length === 0) return 'No custom fields.';
  const grouped = new Map<number, { name: string; id: number; values: { id: number; name: string }[] }>();
  for (const f of fields) {
    const cfId = f.customField?.id;
    if (cfId === undefined) continue;
    if (!grouped.has(cfId)) {
      grouped.set(cfId, { name: f.customField!.name || 'field', id: cfId, values: [] });
    }
    grouped.get(cfId)!.values.push({ id: f.id ?? 0, name: f.name || `#${f.id}` });
  }
  const lines = [`${grouped.size} custom field(s):\n`];
  for (const [, cf] of grouped) {
    const vals = cf.values.map(v => `${v.name} (value.id: ${v.id})`).join(', ');
    lines.push(`  - ${cf.name} (field.id: ${cf.id}): ${vals}`);
  }
  return lines.join('\n');
}

export function formatRelations(relations: TestCaseRelationDto[]): string {
  if (relations.length === 0) return 'No relations.';
  const lines = [`${relations.length} relation(s):\n`];
  for (const r of relations) {
    lines.push(`  - [${r.type}] → ${r.target?.name || 'N/A'} (#${r.target?.id})`);
  }
  return lines.join('\n');
}

export function formatRequirements(requirements: RequirementDto[]): string {
  if (requirements.length === 0) return 'No requirements.';
  const lines = [`${requirements.length} requirement(s):\n`];
  for (const r of requirements) {
    lines.push(`  - ${r.displayName || r.name || 'req'}${r.url ? ` (${r.url})` : ''}`);
  }
  return lines.join('\n');
}

export function formatTestKeys(testKeys: TestKeyDto[]): string {
  if (testKeys.length === 0) return 'No test keys.';
  const lines = [`${testKeys.length} test key(s):\n`];
  for (const tk of testKeys) {
    lines.push(`  - ${tk.name}${tk.url ? ` (${tk.url})` : ''}`);
  }
  return lines.join('\n');
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
    const stat = formatStatistic(l.statistic);
    const closedLabel = l.closed ? 'Closed' : 'Open';
    lines.push(`- [#${l.id}] ${l.name} | ${closedLabel}${stat ? ` | ${stat}` : ''}`);
  }
  return lines.join('\n');
}

export function formatLaunch(l: Launch): string {
  const stat = formatStatistic(l.statistic);
  return [
    `Launch #${l.id}: ${l.name}`,
    l.projectId ? `  Project: ${l.projectId}` : null,
    `  State: ${l.closed ? 'Closed' : 'Open'}`,
    `  Created: ${formatDate(l.createdDate)}`,
    l.lastModifiedDate ? `  Modified: ${formatDate(l.lastModifiedDate)}` : null,
    l.createdBy ? `  Created by: ${l.createdBy}` : null,
    stat ? `  Statistics: ${stat}` : null,
  ].filter(Boolean).join('\n');
}

export function formatTestResults(data: PageResponse<TestResult>): string {
  if (data.content.length === 0) return 'No test results found.';
  const lines = [`Found ${data.totalElements} test result(s) (page ${data.number + 1} of ${data.totalPages}):\n`];
  for (const tr of data.content) {
    lines.push(`- [#${tr.id}] ${tr.name} | Status: ${tr.status || 'pending'}${tr.duration ? ` | Duration: ${tr.duration}ms` : ''}`);
  }
  return lines.join('\n');
}

export function formatTestResult(tr: TestResult): string {
  return [
    `Test Result #${tr.id}: ${tr.name}`,
    `  Status: ${tr.status || 'pending'}`,
    tr.testCaseId ? `  Test Case: #${tr.testCaseId}` : null,
    tr.launchId ? `  Launch: #${tr.launchId}` : null,
    tr.duration ? `  Duration: ${tr.duration}ms` : null,
    tr.assignee ? `  Assignee: ${tr.assignee}` : null,
    tr.manual !== undefined ? `  Manual: ${boolLabel(tr.manual)}` : null,
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
    const total = p.automatedCount + p.manualCount;
    const pct = total > 0 ? ((p.automatedCount / total) * 100).toFixed(1) : '0.0';
    lines.push(`  ${formatDate(p.date)}: ${p.automatedCount}/${total} automated (${pct}%)`);
  }
  return lines.join('\n');
}

export function formatStatusDistribution(data: StatusDistribution[]): string {
  if (data.length === 0) return 'No status distribution data.';
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const lines = [`Status Distribution (total: ${total}):\n`];
  for (const d of data) {
    const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0.0';
    lines.push(`  ${d.statusName}: ${d.count} (${pct}%)`);
  }
  return lines.join('\n');
}

export function formatSuccessRate(data: SuccessRatePoint[]): string {
  if (data.length === 0) return 'No success rate data.';
  const lines = ['Success Rate Trend:\n'];
  for (const p of data) {
    lines.push(`  ${formatDate(p.date)}: ${p.avgSuccessRate.toFixed(1)}% (${p.testResultsCount} results / ${p.testCasesCount} cases)`);
  }
  return lines.join('\n');
}

export function formatTestLayers(data: PageResponse<TestLayer>): string {
  if (data.content.length === 0) return 'No test layers found.';
  const lines = [`${data.totalElements} test layer(s):\n`];
  for (const l of data.content) {
    lines.push(`  - [id: ${l.id}] ${l.name}`);
  }
  return lines.join('\n');
}

export function formatWorkflows(data: PageResponse<Workflow>): string {
  if (data.content.length === 0) return 'No workflows found.';
  const lines = [`${data.totalElements} workflow(s):\n`];
  for (const w of data.content) {
    const statuses = w.statuses?.map(s => `${s.name} (id: ${s.id})`).join(', ') || 'none';
    lines.push(`  - [id: ${w.id}] ${w.name}`);
    lines.push(`    Statuses: ${statuses}`);
  }
  return lines.join('\n');
}
