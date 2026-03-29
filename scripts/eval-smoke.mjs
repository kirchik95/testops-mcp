import { startFakeTestOpsServer } from './fake-testops-server.mjs';
import { assert, expectStartupFailure, extractText, withClient } from './eval-support/mcp-harness.mjs';

async function main() {
  await expectStartupFailure({
    TESTOPS_URL: 'not-a-url',
    TESTOPS_TOKEN: 'fake-api-token',
  }, 'TESTOPS_URL must be a valid http(s) URL');

  const happyServer = await startFakeTestOpsServer({
    authTokens: ['expired-token', 'fresh-token'],
    rejectFirstProjectToken: 'expired-token',
  });

  try {
    await withClient({
      TESTOPS_URL: happyServer.baseUrl,
      TESTOPS_TOKEN: 'fake-api-token',
      TESTOPS_TIMEOUT_MS: 200,
      TESTOPS_RETRY_MAX: 1,
      TESTOPS_RETRY_BASE_MS: 10,
      TESTOPS_PROJECT_ID: 1,
    }, async (client) => {
      const tools = await client.listTools();
      const toolNames = tools.tools.map((tool) => tool.name);
      assert(toolNames.includes('list-projects'), 'list-projects must be registered');
      assert(toolNames.includes('create-test-case'), 'create-test-case must be registered when readOnly=false');

      const projectsResult = await client.callTool({ name: 'list-projects', arguments: {} });
      assert(!projectsResult.isError, `list-projects should succeed: ${extractText(projectsResult)}`);
      assert(extractText(projectsResult).includes('Smoke Project'), 'list-projects result must include the fake project');

      const testCasesResult = await client.callTool({ name: 'list-test-cases', arguments: { projectId: 1 } });
      assert(!testCasesResult.isError, `list-test-cases should succeed: ${extractText(testCasesResult)}`);
      assert(extractText(testCasesResult).includes('Existing Smoke Case'), 'list-test-cases result must include the fake test case');

      const createResult = await client.callTool({
        name: 'create-test-case',
        arguments: { projectId: 1, name: 'Created By Smoke Eval' },
      });
      assert(!createResult.isError, `create-test-case should succeed: ${extractText(createResult)}`);
      assert(extractText(createResult).includes('Created By Smoke Eval'), 'create-test-case result must include the created name');
    });

    assert(happyServer.state.authRequests === 2, `Expected exactly 2 auth requests after 401 refresh flow, got ${happyServer.state.authRequests}`);
    assert(happyServer.state.projectRequests === 2, `Expected 2 project requests because the first one should 401, got ${happyServer.state.projectRequests}`);
    assert(happyServer.state.testCaseListRequests === 1, `Expected one test case list request, got ${happyServer.state.testCaseListRequests}`);
    assert(happyServer.state.createdTestCases.length === 1, `Expected one created test case, got ${happyServer.state.createdTestCases.length}`);
  } finally {
    await happyServer.stop();
  }

  const readOnlyServer = await startFakeTestOpsServer();
  try {
    await withClient({
      TESTOPS_URL: readOnlyServer.baseUrl,
      TESTOPS_TOKEN: 'fake-api-token',
      TESTOPS_READ_ONLY: true,
    }, async (client) => {
      const tools = await client.listTools();
      const toolNames = tools.tools.map((tool) => tool.name);
      assert(!toolNames.includes('create-test-case'), 'create-test-case must not be registered when readOnly=true');
      assert(toolNames.includes('list-test-cases'), 'read tools must still be available when readOnly=true');
    });
  } finally {
    await readOnlyServer.stop();
  }

  const errorServer = await startFakeTestOpsServer({
    projectFailureStatus: 503,
    projectFailureBody: 'Upstream temporary failure',
  });
  try {
    await withClient({
      TESTOPS_URL: errorServer.baseUrl,
      TESTOPS_TOKEN: 'fake-api-token',
      TESTOPS_RETRY_MAX: 1,
      TESTOPS_RETRY_BASE_MS: 10,
    }, async (client) => {
      const result = await client.callTool({ name: 'list-projects', arguments: {} });
      assert(result.isError === true, '5xx project failure must surface as a tool error');
      assert(extractText(result).includes('API error 503'), '5xx project failure must include the HTTP status');
    });
  } finally {
    await errorServer.stop();
  }

  const timeoutServer = await startFakeTestOpsServer({
    testCaseDelayMs: 250,
  });
  try {
    await withClient({
      TESTOPS_URL: timeoutServer.baseUrl,
      TESTOPS_TOKEN: 'fake-api-token',
      TESTOPS_TIMEOUT_MS: 50,
      TESTOPS_RETRY_MAX: 0,
      TESTOPS_PROJECT_ID: 1,
    }, async (client) => {
      const result = await client.callTool({ name: 'list-test-cases', arguments: { projectId: 1 } });
      assert(result.isError === true, 'Timeout failures must surface as tool errors');
      assert(extractText(result).includes('timed out'), 'Timeout failures must mention the timeout');
    });
  } finally {
    await timeoutServer.stop();
  }

  console.log('Smoke eval passed.');
}

main().catch((error) => {
  console.error(`eval:smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
