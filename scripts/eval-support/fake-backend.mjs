import http from 'node:http';
import { createEvalFixtures } from './fixtures.mjs';

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

function parseId(pathname, prefix) {
  return Number.parseInt(pathname.slice(prefix.length), 10);
}

function parseNestedId(pathname, prefix, suffix) {
  return Number.parseInt(pathname.slice(prefix.length, pathname.length - suffix.length), 10);
}

function findById(items, id) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) {
    throw new Error(`Entity not found: ${id}`);
  }
  return item;
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
    jsonResponse(response, 200, findById(state.projects, id));
    return true;
  }

  return false;
}

function handleTestCases(request, response, url, state, options, body) {
  if (request.method === 'GET' && url.pathname === '/api/testcase') {
    state.counters.testCaseListRequests += 1;
    const projectId = Number.parseInt(url.searchParams.get('projectId') ?? '0', 10);
    const filtered = state.testCases.filter((testCase) => testCase.projectId === projectId);
    jsonResponse(response, 200, page(filtered));
    return true;
  }

  if (request.method === 'GET' && url.pathname === '/api/testcase/search') {
    const projectId = Number.parseInt(url.searchParams.get('projectId') ?? '0', 10);
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

    const created = {
      id: state.nextIds.testCase,
      name: body.name ?? 'Unnamed test case',
      projectId: body.projectId,
      description: body.description,
      automated: body.automated ?? false,
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
    state.testCaseMembers[created.id] = [];
    state.counters.createdTestCases.push(created);
    jsonResponse(response, 200, created);
    return true;
  }

  if (request.method === 'GET' && /^\/api\/testcase\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testcase/');
    jsonResponse(response, 200, findById(state.testCases, id));
    return true;
  }

  if (request.method === 'PATCH' && /^\/api\/testcase\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testcase/');
    const current = findById(state.testCases, id);
    Object.assign(current, body, { lastModifiedDate: Date.now(), lastModifiedBy: 'eval' });
    jsonResponse(response, 200, current);
    return true;
  }

  if (request.method === 'DELETE' && /^\/api\/testcase\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testcase/');
    state.testCases = state.testCases.filter((testCase) => testCase.id !== id);
    noContent(response);
    return true;
  }

  if (request.method === 'GET' && /^\/api\/testcase\/\d+\/overview$/.test(url.pathname)) {
    const id = parseNestedId(url.pathname, '/api/testcase/', '/overview');
    jsonResponse(response, 200, buildOverview(state, id));
    return true;
  }

  if (request.method === 'GET' && /^\/api\/testcase\/\d+\/scenario$/.test(url.pathname)) {
    const id = parseNestedId(url.pathname, '/api/testcase/', '/scenario');
    jsonResponse(response, 200, state.testCaseScenarios[id] ?? { steps: [] });
    return true;
  }

  if (request.method === 'POST' && /^\/api\/testcase\/\d+\/scenario$/.test(url.pathname)) {
    const id = parseNestedId(url.pathname, '/api/testcase/', '/scenario');
    state.testCaseScenarios[id] = body;
    jsonResponse(response, 200, state.testCaseScenarios[id]);
    return true;
  }

  const subResources = [
    ['issue', 'testCaseIssues'],
    ['members', 'testCaseMembers'],
    ['cfv', 'testCaseCustomFields'],
    ['relation', 'testCaseRelations'],
    ['requirement', 'testCaseRequirements'],
    ['testkey', 'testCaseTestKeys'],
  ];

  for (const [suffix, stateKey] of subResources) {
    const pattern = new RegExp(`^/api/testcase/\\d+/${suffix}$`);
    if (!pattern.test(url.pathname)) continue;
    const id = parseNestedId(url.pathname, '/api/testcase/', `/${suffix}`);
    if (request.method === 'GET') {
      jsonResponse(response, 200, state[stateKey][id] ?? []);
      return true;
    }
    if (request.method === 'POST') {
      state[stateKey][id] = body;
      jsonResponse(response, 200, state[stateKey][id]);
      return true;
    }
  }

  return false;
}

function handleTestPlans(request, response, url, state, body) {
  if (request.method === 'GET' && url.pathname === '/api/testplan') {
    const projectId = Number.parseInt(url.searchParams.get('projectId') ?? '0', 10);
    jsonResponse(response, 200, page(state.testPlans.filter((plan) => plan.projectId === projectId)));
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/api/testplan') {
    const created = {
      id: state.nextIds.testPlan,
      name: body.name,
      projectId: body.projectId,
      description: body.description,
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
    jsonResponse(response, 200, findById(state.testPlans, id));
    return true;
  }

  if (request.method === 'PATCH' && /^\/api\/testplan\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testplan/');
    const current = findById(state.testPlans, id);
    Object.assign(current, body);
    jsonResponse(response, 200, current);
    return true;
  }

  if (request.method === 'GET' && /^\/api\/testplan\/\d+\/testcase$/.test(url.pathname)) {
    const id = parseNestedId(url.pathname, '/api/testplan/', '/testcase');
    const linkedIds = state.testPlanTestCaseIds[id] ?? [];
    const linkedCases = state.testCases.filter((testCase) => linkedIds.includes(testCase.id));
    jsonResponse(response, 200, page(linkedCases));
    return true;
  }

  return false;
}

function handleLaunches(request, response, url, state) {
  if (request.method === 'GET' && url.pathname === '/api/launch') {
    const projectId = Number.parseInt(url.searchParams.get('projectId') ?? '0', 10);
    jsonResponse(response, 200, page(state.launches.filter((launch) => launch.projectId === projectId)));
    return true;
  }

  if (request.method === 'GET' && /^\/api\/launch\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/launch/');
    jsonResponse(response, 200, findById(state.launches, id));
    return true;
  }

  if (request.method === 'GET' && /^\/api\/launch\/\d+\/statistic$/.test(url.pathname)) {
    const id = parseNestedId(url.pathname, '/api/launch/', '/statistic');
    jsonResponse(response, 200, findById(state.launches, id).statistic ?? []);
    return true;
  }

  return false;
}

function handleTestResults(request, response, url, state, body) {
  if (request.method === 'GET' && url.pathname === '/api/testresult') {
    const projectId = Number.parseInt(url.searchParams.get('projectId') ?? '0', 10);
    const launchId = url.searchParams.get('launchId');
    const filtered = state.testResults.filter((result) => {
      const projectMatches = Number.isNaN(projectId) || projectId === 0 ? true : result.projectId === projectId;
      const launchMatches = launchId ? result.launchId === Number.parseInt(launchId, 10) : true;
      return projectMatches && launchMatches;
    });
    jsonResponse(response, 200, page(filtered));
    return true;
  }

  if (request.method === 'GET' && /^\/api\/testresult\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testresult/');
    jsonResponse(response, 200, findById(state.testResults, id));
    return true;
  }

  if (request.method === 'PATCH' && /^\/api\/testresult\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/testresult/');
    const current = findById(state.testResults, id);
    Object.assign(current, body);
    jsonResponse(response, 200, current);
    return true;
  }

  return false;
}

function handleDefects(request, response, url, state, body) {
  if (request.method === 'GET' && url.pathname === '/api/defect') {
    const projectId = Number.parseInt(url.searchParams.get('projectId') ?? '0', 10);
    jsonResponse(response, 200, page(state.defects.filter((defect) => defect.projectId === projectId)));
    return true;
  }

  if (request.method === 'POST' && url.pathname === '/api/defect') {
    const created = {
      id: state.nextIds.defect,
      name: body.name,
      projectId: body.projectId,
      description: body.description,
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
    jsonResponse(response, 200, findById(state.defects, id));
    return true;
  }

  if (request.method === 'PATCH' && /^\/api\/defect\/\d+$/.test(url.pathname)) {
    const id = parseId(url.pathname, '/api/defect/');
    const current = findById(state.defects, id);
    Object.assign(current, body);
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
    const parsedBody = rawBody ? JSON.parse(rawBody) : undefined;

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
