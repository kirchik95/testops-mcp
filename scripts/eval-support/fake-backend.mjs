import http from 'node:http';
import { z } from 'zod/v4';
import { apiContracts } from './contracts.mjs';
import { createEvalFixtures } from './fixtures.mjs';

const positiveIntSchema = z.number().int().positive();
const nonEmptyStringSchema = z.string().trim().min(1);
const testStatusSchema = z.enum(['failed', 'broken', 'passed', 'skipped', 'unknown', 'in_progress']);

const scenarioStepSchema = z.lazy(() => z.object({
  name: nonEmptyStringSchema,
  keyword: z.string().optional(),
  expectedResult: z.string().optional(),
  steps: z.array(scenarioStepSchema).optional(),
}));

const issueSchema = z.object({
  name: nonEmptyStringSchema,
  url: nonEmptyStringSchema,
  integrationId: positiveIntSchema,
  displayName: z.string().optional(),
});

const memberSchema = z.object({
  id: positiveIntSchema.optional(),
  name: z.string().optional(),
  role: z.object({
    id: positiveIntSchema.optional(),
    name: z.string().optional(),
  }).optional(),
});

const customFieldValueSchema = z.object({
  id: z.number().int().nonnegative().optional(),
  name: z.string().optional(),
  customField: z.object({
    id: positiveIntSchema,
    name: z.string().optional(),
  }),
});

const relationSchema = z.object({
  type: nonEmptyStringSchema,
  target: z.object({
    id: positiveIntSchema,
    name: z.string().optional(),
  }),
});

const requirementSchema = z.object({
  name: nonEmptyStringSchema,
  displayName: z.string().optional(),
  url: z.string().optional(),
});

const testKeySchema = z.object({
  name: nonEmptyStringSchema,
  url: z.string().optional(),
});

const createTestCaseSchema = z.object({
  name: nonEmptyStringSchema,
  projectId: positiveIntSchema,
  description: z.string().optional(),
  automated: z.boolean().optional(),
});

const updateTestCaseSchema = z.object({
  name: nonEmptyStringSchema.optional(),
  description: z.string().optional(),
  automated: z.boolean().optional(),
  duration: z.number().int().nonnegative().optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'PATCH payload must include at least one field',
});

const createTestPlanSchema = z.object({
  name: nonEmptyStringSchema,
  projectId: positiveIntSchema,
  description: z.string().optional(),
});

const updateTestPlanSchema = z.object({
  name: nonEmptyStringSchema.optional(),
  description: z.string().optional(),
  status: nonEmptyStringSchema.optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'PATCH payload must include at least one field',
});

const createDefectSchema = z.object({
  name: nonEmptyStringSchema,
  projectId: positiveIntSchema,
  description: z.string().optional(),
});

const updateDefectSchema = z.object({
  name: nonEmptyStringSchema.optional(),
  description: z.string().optional(),
  status: nonEmptyStringSchema.optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'PATCH payload must include at least one field',
});

const updateTestResultSchema = z.object({
  status: testStatusSchema.optional(),
  comment: z.string().optional(),
}).refine((payload) => Object.keys(payload).length > 0, {
  message: 'PATCH payload must include at least one field',
});

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function textResponse(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(payload);
}

function noContent(response) {
  response.writeHead(204);
  response.end();
}

function page(content) {
  return {
    content,
    totalElements: content.length,
    totalPages: content.length === 0 ? 0 : 1,
    number: 0,
    size: content.length === 0 ? 20 : content.length,
  };
}

function unauthorized(response) {
  jsonResponse(response, 401, { message: 'Unauthorized' });
}

function badRequest(response, message) {
  textResponse(response, 400, message);
}

function notFound(response, message) {
  textResponse(response, 404, message);
}

function parseId(pathname, prefix) {
  return Number.parseInt(pathname.slice(prefix.length), 10);
}

function parseNestedId(pathname, prefix, suffix) {
  return Number.parseInt(pathname.slice(prefix.length, pathname.length - suffix.length), 10);
}

function findById(items, id) {
  return items.find((candidate) => candidate.id === id);
}

function ensureEntity(entity, type, id, response) {
  if (!entity) {
    notFound(response, `${type} not found: ${id}`);
    return false;
  }
  return true;
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function parseJsonBody(rawBody, response) {
  if (!rawBody) return undefined;
  try {
    return JSON.parse(rawBody);
  } catch {
    badRequest(response, 'Request body must be valid JSON');
    return null;
  }
}

function validate(schema, payload, response) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const issue = result.error.issues[0];
    badRequest(response, issue?.message ?? 'Invalid request payload');
    return null;
  }
  return result.data;
}

function requirePositiveQueryInt(url, key, response, { optional = false } = {}) {
  const raw = url.searchParams.get(key);
  if (raw === null || raw === '') {
    if (optional) return undefined;
    badRequest(response, `Query parameter ${key} is required`);
    return null;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value <= 0) {
    badRequest(response, `Query parameter ${key} must be a positive integer`);
    return null;
  }

  return value;
}

function buildOverview(state, id) {
  const base = findById(state.testCases, id);
  return {
    ...base,
    members: state.testCaseMembers[id] ?? [],
    customFields: state.testCaseCustomFields[id] ?? [],
    issues: state.testCaseIssues[id] ?? [],
    requirements: state.testCaseRequirements[id] ?? [],
    testKeys: state.testCaseTestKeys[id] ?? [],
  };
}

function assertContractCoverage() {
  const actualContractSignatures = new Set(apiContracts.map((contract) => `${contract.method} ${contract.path}`));
  if (actualContractSignatures.size !== apiContracts.length) {
    throw new Error('Duplicate API contract signatures detected in scripts/eval-support/contracts.mjs');
  }
}

function handleProjects(request, response, url, state, options) {
  if (request.method === 'GET' && url.pathname === '/api/project') {
    state.counters.projectRequests += 1;
    if (options.projectFailureStatus) {
      textResponse(response, options.projectFailureStatus, options.projectFailureBody ?? 'Project failure');
      return true;
    }

    if (options.rejectFirstProjectToken && request.headers.authorization === `Bearer ${options.rejectFirstProjectToken}` && !state.counters.firstProjectUnauthorized) {
      state.counters.firstProjectUnauthorized = true;
      unauthorized(response);
      return true;
    }

    jsonResponse(response, 200, page(state.projects));
    return true;
  }

  if (request.method === 'GET' && /^\/api\/project\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/project/');
    const project = findById(state.projects, id);
    if (!ensureEntity(project, 'Project', id, response)) return true;
    jsonResponse(response, 200, project);
    return true;
  }

  return false;
}

function handleTestCases(request, response, url, state, options, body) {
  if (request.method === 'GET' && url.pathname === '/api/testcase') {
    state.counters.testCaseListRequests += 1;
    const projectId = requirePositiveQueryInt(url, 'projectId', response);
    if (projectId === null) return true;
    const filtered = state.testCases.filter((testCase) => testCase.projectId === projectId);
    jsonResponse(response, 200, page(filtered));
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/api/testcase/search') {
    const projectId = requirePositiveQueryInt(url, 'projectId', response);
    if (projectId === null) return true;
    const filtered = state.testCases.filter((testCase) => testCase.projectId === projectId);
    jsonResponse(response, 200, page(filtered));
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/api/testcase') {
    state.counters.createTestCaseRequests += 1;
    if (options.createTestCaseFailureStatus) {
      textResponse(response, options.createTestCaseFailureStatus, options.createTestCaseFailureBody ?? 'Create failure');
      return true;
    }

    const payload = validate(createTestCaseSchema, body, response);
    if (!payload) return true;

    const created = {
      id: state.nextIds.testCase,
      name: payload.name,
      projectId: payload.projectId,
      description: payload.description,
      automated: payload.automated ?? false,
      status: { id: 101, name: 'Active' },
      testLayer: { id: 201, name: 'API' },
      createdDate: Date.now(),
      lastModifiedDate: Date.now(),
      createdBy: 'eval',
      lastModifiedBy: 'eval',
    };
    state.nextIds.testCase += 1;
    state.testCases.push(created);
    state.testCaseScenarios[created.id] = { steps: [] };
    state.testCaseStepTrees[created.id] = { root: { children: [] }, scenarioSteps: {}, attachments: {}, sharedSteps: {}, sharedStepScenarioSteps: {}, sharedStepAttachments: {} };
    state.testCaseMembers[created.id] = [];
    state.counters.createdTestCases.push(created);
    jsonResponse(response, 200, created);
    return true;
  }

  if (request.method === 'GET' && /^\/api\/testcase\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testcase/');
    const testCase = findById(state.testCases, id);
    if (!ensureEntity(testCase, 'Test case', id, response)) return true;
    jsonResponse(response, 200, testCase);
    return true;
  }

  if (request.method === 'PATCH' && /^\/api\/testcase\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testcase/');
    const current = findById(state.testCases, id);
    if (!ensureEntity(current, 'Test case', id, response)) return true;
    const payload = validate(updateTestCaseSchema, body, response);
    if (!payload) return true;
    Object.assign(current, payload, { lastModifiedDate: Date.now(), lastModifiedBy: 'eval' });
    jsonResponse(response, 200, current);
    return true;
  }

  if (request.method === 'DELETE' && /^\/api\/testcase\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testcase/');
    const testCase = findById(state.testCases, id);
    if (!ensureEntity(testCase, 'Test case', id, response)) return true;
    state.testCases = state.testCases.filter((candidate) => candidate.id !== id);
    noContent(response);
    return true;
  }

  if (request.method === 'GET' && /^\/api\/testcase\/\d+\/overview$/.test(url.pathname)) {
    const id = parseNestedId(url.pathname, '/api/testcase/', '/overview');
    const testCase = findById(state.testCases, id);
    if (!ensureEntity(testCase, 'Test case', id, response)) return true;
    jsonResponse(response, 200, buildOverview(state, id));
    return true;
  }

  if (request.method === 'GET' && /^\/api\/testcase\/\d+\/scenario$/.test(url.pathname)) {
    const id = parseNestedId(url.pathname, '/api/testcase/', '/scenario');
    const testCase = findById(state.testCases, id);
    if (!ensureEntity(testCase, 'Test case', id, response)) return true;
    jsonResponse(response, 200, state.testCaseScenarios[id] ?? { steps: [] });
    return true;
  }

  if (request.method === 'POST' && /^\/api\/testcase\/\d+\/scenario$/.test(url.pathname)) {
    const id = parseNestedId(url.pathname, '/api/testcase/', '/scenario');
    const testCase = findById(state.testCases, id);
    if (!ensureEntity(testCase, 'Test case', id, response)) return true;
    const payload = validate(z.object({ steps: z.array(scenarioStepSchema) }), body, response);
    if (!payload) return true;
    state.testCaseScenarios[id] = payload;
    jsonResponse(response, 200, state.testCaseScenarios[id]);
    return true;
  }

  if (request.method === 'GET' && /^\/api\/testcase\/\d+\/step$/.test(url.pathname)) {
    const id = parseNestedId(url.pathname, '/api/testcase/', '/step');
    const testCase = findById(state.testCases, id);
    if (!ensureEntity(testCase, 'Test case', id, response)) return true;
    const defaultTree = { root: { children: [] }, scenarioSteps: {}, attachments: {}, sharedSteps: {}, sharedStepScenarioSteps: {}, sharedStepAttachments: {} };
    jsonResponse(response, 200, state.testCaseStepTrees[id] ?? defaultTree);
    return true;
  }

  const subResources = [
    ['issue', 'testCaseIssues', z.array(issueSchema)],
    ['members', 'testCaseMembers', z.array(memberSchema)],
    ['cfv', 'testCaseCustomFields', z.array(customFieldValueSchema)],
    ['relation', 'testCaseRelations', z.array(relationSchema)],
    ['requirement', 'testCaseRequirements', z.array(requirementSchema)],
    ['testkey', 'testCaseTestKeys', z.array(testKeySchema)],
  ];

  for (const [suffix, stateKey, schema] of subResources) {
    const pattern = new RegExp(`^/api/testcase/\\d+/${suffix}$`);
    if (!pattern.test(url.pathname)) continue;
    const id = parseNestedId(url.pathname, '/api/testcase/', `/${suffix}`);
    const testCase = findById(state.testCases, id);
    if (!ensureEntity(testCase, 'Test case', id, response)) return true;

    if (request.method === 'GET') {
      if (suffix === 'cfv') {
        const projectId = requirePositiveQueryInt(url, 'projectId', response);
        if (projectId === null) return true;
        if (projectId !== testCase.projectId) {
          notFound(response, `Project not found for test case ${id}: ${projectId}`);
          return true;
        }
      }
      jsonResponse(response, 200, state[stateKey][id] ?? []);
      return true;
    }

    if (request.method === 'POST') {
      const payload = validate(schema, body, response);
      if (!payload) return true;
      state[stateKey][id] = payload;
      jsonResponse(response, 200, state[stateKey][id]);
      return true;
    }
  }

  return false;
}

function handleTestPlans(request, response, url, state, body) {
  if (request.method === 'GET' && url.pathname === '/api/testplan') {
    const projectId = requirePositiveQueryInt(url, 'projectId', response);
    if (projectId === null) return true;
    jsonResponse(response, 200, page(state.testPlans.filter((plan) => plan.projectId === projectId)));
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/api/testplan') {
    const payload = validate(createTestPlanSchema, body, response);
    if (!payload) return true;

    const created = {
      id: state.nextIds.testPlan,
      name: payload.name,
      projectId: payload.projectId,
      description: payload.description,
      status: 'Draft',
      createdBy: 'eval',
      createdDate: Date.now(),
    };
    state.nextIds.testPlan += 1;
    state.testPlans.push(created);
    state.testPlanTestCaseIds[created.id] = [11];
    jsonResponse(response, 200, created);
    return true;
  }

  if (request.method === 'GET' && /^\/api\/testplan\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testplan/');
    const plan = findById(state.testPlans, id);
    if (!ensureEntity(plan, 'Test plan', id, response)) return true;
    jsonResponse(response, 200, plan);
    return true;
  }

  if (request.method === 'PATCH' && /^\/api\/testplan\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testplan/');
    const current = findById(state.testPlans, id);
    if (!ensureEntity(current, 'Test plan', id, response)) return true;
    const payload = validate(updateTestPlanSchema, body, response);
    if (!payload) return true;
    Object.assign(current, payload);
    jsonResponse(response, 200, current);
    return true;
  }

  if (request.method === 'GET' && /^\/api\/testplan\/\d+\/testcase$/.test(url.pathname)) {
    const id = parseNestedId(url.pathname, '/api/testplan/', '/testcase');
    const plan = findById(state.testPlans, id);
    if (!ensureEntity(plan, 'Test plan', id, response)) return true;
    const linkedIds = state.testPlanTestCaseIds[id] ?? [];
    const linkedCases = state.testCases.filter((testCase) => linkedIds.includes(testCase.id));
    jsonResponse(response, 200, page(linkedCases));
    return true;
  }

  return false;
}

function handleLaunches(request, response, url, state) {
  if (request.method === 'GET' && url.pathname === '/api/launch') {
    const projectId = requirePositiveQueryInt(url, 'projectId', response);
    if (projectId === null) return true;
    jsonResponse(response, 200, page(state.launches.filter((launch) => launch.projectId === projectId)));
    return true;
  }

  if (request.method === 'GET' && /^\/api\/launch\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/launch/');
    const launch = findById(state.launches, id);
    if (!ensureEntity(launch, 'Launch', id, response)) return true;
    jsonResponse(response, 200, launch);
    return true;
  }

  if (request.method === 'GET' && /^\/api\/launch\/\d+\/statistic$/.test(url.pathname)) {
    const id = parseNestedId(url.pathname, '/api/launch/', '/statistic');
    const launch = findById(state.launches, id);
    if (!ensureEntity(launch, 'Launch', id, response)) return true;
    jsonResponse(response, 200, launch.statistic ?? []);
    return true;
  }

  return false;
}

function handleTestResults(request, response, url, state, body) {
  if (request.method === 'GET' && url.pathname === '/api/testresult') {
    const projectId = requirePositiveQueryInt(url, 'projectId', response, { optional: true });
    if (projectId === null) return true;
    const launchId = requirePositiveQueryInt(url, 'launchId', response, { optional: true });
    if (launchId === null) return true;

    const filtered = state.testResults.filter((result) => {
      const projectMatches = projectId === undefined ? true : result.projectId === projectId;
      const launchMatches = launchId === undefined ? true : result.launchId === launchId;
      return projectMatches && launchMatches;
    });
    jsonResponse(response, 200, page(filtered));
    return true;
  }

  if (request.method === 'GET' && /^\/api\/testresult\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testresult/');
    const result = findById(state.testResults, id);
    if (!ensureEntity(result, 'Test result', id, response)) return true;
    jsonResponse(response, 200, result);
    return true;
  }

  if (request.method === 'PATCH' && /^\/api\/testresult\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testresult/');
    const current = findById(state.testResults, id);
    if (!ensureEntity(current, 'Test result', id, response)) return true;
    const payload = validate(updateTestResultSchema, body, response);
    if (!payload) return true;
    Object.assign(current, payload, payload.comment ? { message: payload.comment } : {});
    jsonResponse(response, 200, current);
    return true;
  }

  return false;
}

function handleDefects(request, response, url, state, body) {
  if (request.method === 'GET' && url.pathname === '/api/defect') {
    const projectId = requirePositiveQueryInt(url, 'projectId', response);
    if (projectId === null) return true;
    jsonResponse(response, 200, page(state.defects.filter((defect) => defect.projectId === projectId)));
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/api/defect') {
    const payload = validate(createDefectSchema, body, response);
    if (!payload) return true;
    const created = {
      id: state.nextIds.defect,
      name: payload.name,
      projectId: payload.projectId,
      description: payload.description,
      status: 'Open',
      createdDate: Date.now(),
      createdBy: 'eval',
    };
    state.nextIds.defect += 1;
    state.defects.push(created);
    jsonResponse(response, 200, created);
    return true;
  }

  if (request.method === 'GET' && /^\/api\/defect\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/defect/');
    const defect = findById(state.defects, id);
    if (!ensureEntity(defect, 'Defect', id, response)) return true;
    jsonResponse(response, 200, defect);
    return true;
  }

  if (request.method === 'PATCH' && /^\/api\/defect\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/defect/');
    const current = findById(state.defects, id);
    if (!ensureEntity(current, 'Defect', id, response)) return true;
    const payload = validate(updateDefectSchema, body, response);
    if (!payload) return true;
    Object.assign(current, payload);
    jsonResponse(response, 200, current);
    return true;
  }

  return false;
}

function handleAnalytics(request, response, url, state) {
  if (request.method === 'GET' && /^\/api\/analytic\/\d+\/automation_chart$/.test(url.pathname)) {
    jsonResponse(response, 200, state.analytics.automationTrend);
    return true;
  }

  if (request.method === 'GET' && /^\/api\/analytic\/\d+\/group_by_status$/.test(url.pathname)) {
    jsonResponse(response, 200, state.analytics.statusDistribution);
    return true;
  }

  if (request.method === 'GET' && /^\/api\/analytic\/\d+\/tc_success_rate$/.test(url.pathname)) {
    jsonResponse(response, 200, state.analytics.successRate);
    return true;
  }

  return false;
}

function handleReferenceData(request, response, url, state) {
  if (request.method === 'GET' && url.pathname === '/api/testlayer') {
    jsonResponse(response, 200, page(state.testLayers));
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/api/workflow') {
    jsonResponse(response, 200, page(state.workflows));
    return true;
  }

  return false;
}

export async function startFakeTestOpsServer(options = {}) {
  assertContractCoverage();

  const fixtures = createEvalFixtures();
  const state = {
    ...fixtures,
    counters: {
      authRequests: 0,
      projectRequests: 0,
      testCaseListRequests: 0,
      createTestCaseRequests: 0,
      createdTestCases: [],
      firstProjectUnauthorized: false,
    },
    nextIds: {
      testCase: 1000,
      testPlan: 2000,
      defect: 3000,
    },
  };

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');

    if (request.method === 'GET' && url.pathname === '/__state') {
      jsonResponse(response, 200, state.counters);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/uaa/oauth/token') {
      state.counters.authRequests += 1;
      const body = new URLSearchParams(await readBody(request));
      if (body.get('token') !== (options.expectedApiToken ?? 'fake-api-token')) {
        textResponse(response, 401, 'Invalid API token');
        return;
      }

      const tokenSequence = options.authTokens ?? ['stable-token'];
      const token = tokenSequence[Math.min(state.counters.authRequests - 1, tokenSequence.length - 1)];
      jsonResponse(response, 200, {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
      });
      return;
    }

    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/uaa/oauth/token') {
      if (!request.headers.authorization?.startsWith('Bearer ')) {
        unauthorized(response);
        return;
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/project' && options.projectDelayMs) {
      await delay(options.projectDelayMs);
    }

    if (url.pathname === '/api/testcase' && request.method === 'GET' && options.testCaseDelayMs) {
      await delay(options.testCaseDelayMs);
    }

    const rawBody = request.method === 'POST' || request.method === 'PATCH'
      ? await readBody(request)
      : undefined;
    const parsedBody = parseJsonBody(rawBody, response);
    if (parsedBody === null) return;

    const handled = (
      handleProjects(request, response, url, state, options)
      || handleTestCases(request, response, url, state, options, parsedBody)
      || handleTestPlans(request, response, url, state, parsedBody)
      || handleLaunches(request, response, url, state)
      || handleTestResults(request, response, url, state, parsedBody)
      || handleDefects(request, response, url, state, parsedBody)
      || handleAnalytics(request, response, url, state)
      || handleReferenceData(request, response, url, state)
    );

    if (!handled) {
      textResponse(response, 404, `Unhandled fake endpoint: ${request.method} ${url.pathname}`);
    }
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Fake TestOps server did not expose a TCP port');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    state: state.counters,
    async stop() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}
