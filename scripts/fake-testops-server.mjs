import http from 'node:http';

function jsonResponse(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function textResponse(response, statusCode, payload) {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(payload);
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

function makePage(content) {
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

export async function startFakeTestOpsServer(options = {}) {
  const state = {
    authRequests: 0,
    projectRequests: 0,
    testCaseListRequests: 0,
    createTestCaseRequests: 0,
    createdTestCases: [],
    firstProjectUnauthorized: false,
  };
  const projects = options.projects ?? [{ id: 1, name: 'Smoke Project', isPublic: false }];
  const testCases = options.testCases ?? [{ id: 11, name: 'Existing Smoke Case', projectId: 1 }];
  let nextTestCaseId = options.nextTestCaseId ?? 1000;

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const authHeader = request.headers.authorization;

    if (request.method === 'POST' && url.pathname === '/api/uaa/oauth/token') {
      state.authRequests += 1;
      const body = new URLSearchParams(await readBody(request));
      if (body.get('token') !== (options.expectedApiToken ?? 'fake-api-token')) {
        textResponse(response, 401, 'Invalid API token');
        return;
      }

      const tokenSequence = options.authTokens ?? ['stable-token'];
      const token = tokenSequence[Math.min(state.authRequests - 1, tokenSequence.length - 1)];
      jsonResponse(response, 200, {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
      });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/__state') {
      jsonResponse(response, 200, state);
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      if (!authHeader?.startsWith('Bearer ')) {
        unauthorized(response);
        return;
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/project') {
      state.projectRequests += 1;

      if (options.projectDelayMs) {
        await delay(options.projectDelayMs);
      }

      if (options.projectFailureStatus) {
        textResponse(response, options.projectFailureStatus, options.projectFailureBody ?? 'Project failure');
        return;
      }

      if (options.rejectFirstProjectToken && authHeader === `Bearer ${options.rejectFirstProjectToken}` && !state.firstProjectUnauthorized) {
        state.firstProjectUnauthorized = true;
        unauthorized(response);
        return;
      }

      jsonResponse(response, 200, makePage(projects));
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/testcase') {
      state.testCaseListRequests += 1;

      if (options.testCaseDelayMs) {
        await delay(options.testCaseDelayMs);
      }

      if (options.testCaseFailureStatus) {
        textResponse(response, options.testCaseFailureStatus, options.testCaseFailureBody ?? 'Test case failure');
        return;
      }

      const projectId = Number.parseInt(url.searchParams.get('projectId') ?? '0', 10);
      const filtered = testCases.filter((testCase) => testCase.projectId === projectId);
      jsonResponse(response, 200, makePage(filtered));
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/testcase') {
      state.createTestCaseRequests += 1;
      const body = JSON.parse(await readBody(request) || '{}');

      if (options.createTestCaseFailureStatus) {
        textResponse(response, options.createTestCaseFailureStatus, options.createTestCaseFailureBody ?? 'Create failure');
        return;
      }

      const created = {
        id: nextTestCaseId,
        name: body.name ?? 'Unnamed smoke test case',
        projectId: body.projectId,
        description: body.description,
        automated: body.automated,
      };
      nextTestCaseId += 1;
      state.createdTestCases.push(created);
      testCases.push(created);
      jsonResponse(response, 200, created);
      return;
    }

    textResponse(response, 404, `Unhandled fake endpoint: ${request.method} ${url.pathname}`);
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
    state,
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
