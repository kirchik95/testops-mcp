import { startFakeTestOpsServer } from './fake-testops-server.mjs';
import {
  assert,
  assertSecretsAbsent,
  extractText,
  parseJsonStderr,
  withClient,
} from './eval-support/mcp-harness.mjs';

async function runHappyPathMatrix(baseUrl) {
  await withClient({
    TESTOPS_URL: baseUrl,
    TESTOPS_TOKEN: 'fake-api-token',
    TESTOPS_PROJECT_ID: 1,
  }, async (client) => {
    const projectResult = await client.callTool({ name: 'get-project', arguments: { id: 1 } });
    assert(extractText(projectResult).includes('Smoke Project'), 'get-project must return the fake project');

    const overviewResult = await client.callTool({ name: 'get-test-case-overview', arguments: { id: 11 } });
    assert(extractText(overviewResult).includes('Existing Smoke Case'), 'get-test-case-overview must return the fake test case');

    const updateCaseResult = await client.callTool({
      name: 'update-test-case',
      arguments: { id: 11, name: 'Updated Smoke Case' },
    });
    assert(extractText(updateCaseResult).includes('Updated Smoke Case'), 'update-test-case must update the case name');

    const scenarioResult = await client.callTool({
      name: 'update-test-case-scenario',
      arguments: {
        id: 11,
        steps: [
          { keyword: 'Given', name: 'Updated setup' },
          { keyword: 'Then', name: 'Updated outcome', expectedResult: 'Updated outcome' },
        ],
      },
    });
    assert(extractText(scenarioResult).includes('Updated setup'), 'update-test-case-scenario must return the updated steps');

    const createPlanResult = await client.callTool({
      name: 'create-test-plan',
      arguments: { projectId: 1, name: 'Matrix Plan', description: 'Created in eval matrix' },
    });
    assert(extractText(createPlanResult).includes('Matrix Plan'), 'create-test-plan must create a new plan');

    const updatePlanResult = await client.callTool({
      name: 'update-test-plan',
      arguments: { id: 21, status: 'Archived' },
    });
    assert(extractText(updatePlanResult).includes('Archived'), 'update-test-plan must update the status');

    const planCasesResult = await client.callTool({ name: 'get-test-plan-test-cases', arguments: { id: 21 } });
    assert(extractText(planCasesResult).includes('Existing Smoke Case') || extractText(planCasesResult).includes('Updated Smoke Case'), 'get-test-plan-test-cases must return linked cases');

    const launchesResult = await client.callTool({ name: 'list-launches', arguments: { projectId: 1 } });
    assert(extractText(launchesResult).includes('Release Launch'), 'list-launches must return the fake launch');

    const launchResult = await client.callTool({ name: 'get-launch', arguments: { id: 31 } });
    assert(extractText(launchResult).includes('Release Launch'), 'get-launch must return the fake launch');

    const launchResults = await client.callTool({ name: 'get-launch-test-results', arguments: { id: 31 } });
    assert(extractText(launchResults).includes('Checkout flow result'), 'get-launch-test-results must return the fake results');

    const testResultsResult = await client.callTool({ name: 'list-test-results', arguments: { projectId: 1, launchId: 31 } });
    assert(extractText(testResultsResult).includes('Checkout flow result'), 'list-test-results must return the fake results');

    const updateTestResult = await client.callTool({
      name: 'update-test-result',
      arguments: { id: 41, status: 'failed', comment: 'Changed in matrix' },
    });
    assert(extractText(updateTestResult).includes('failed'), 'update-test-result must update the result status');

    const defectsResult = await client.callTool({ name: 'list-defects', arguments: { projectId: 1 } });
    assert(extractText(defectsResult).includes('Payment defect'), 'list-defects must return the fake defect');

    const createDefectResult = await client.callTool({
      name: 'create-defect',
      arguments: { projectId: 1, name: 'Created defect', description: 'New defect from matrix' },
    });
    assert(extractText(createDefectResult).includes('Created defect'), 'create-defect must create a new defect');

    const updateDefectResult = await client.callTool({
      name: 'update-defect',
      arguments: { id: 51, status: 'Closed' },
    });
    assert(extractText(updateDefectResult).includes('Closed'), 'update-defect must update the defect status');

    const automationTrend = await client.callTool({ name: 'get-automation-trend', arguments: { projectId: 1 } });
    assert(extractText(automationTrend).includes('automated'), 'get-automation-trend must return analytics data');

    const statusDistribution = await client.callTool({ name: 'get-status-distribution', arguments: { projectId: 1 } });
    assert(extractText(statusDistribution).includes('Active'), 'get-status-distribution must return analytics data');

    const successRate = await client.callTool({ name: 'get-success-rate', arguments: { projectId: 1 } });
    assert(extractText(successRate).includes('%'), 'get-success-rate must return analytics data');

    const testLayers = await client.callTool({ name: 'list-test-layers', arguments: {} });
    assert(extractText(testLayers).includes('API'), 'list-test-layers must return reference data');

    const workflows = await client.callTool({ name: 'list-workflows', arguments: {} });
    assert(extractText(workflows).includes('Default Workflow'), 'list-workflows must return reference data');
  });
}

async function runReadOnlyMatrix(baseUrl) {
  await withClient({
    TESTOPS_URL: baseUrl,
    TESTOPS_TOKEN: 'fake-api-token',
    TESTOPS_PROJECT_ID: 1,
    TESTOPS_READ_ONLY: true,
  }, async (client) => {
    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);
    const forbiddenNames = [
      'create-test-case',
      'update-test-case',
      'update-test-case-scenario',
      'create-test-plan',
      'update-test-plan',
      'create-defect',
      'update-defect',
      'update-test-result',
    ];

    for (const name of forbiddenNames) {
      assert(!toolNames.includes(name), `${name} must not be registered in read-only mode`);
    }
  });
}

function requireField(entry, fieldName, message) {
  assert(fieldName in entry, message);
}

function requireEvent(entries, eventName, message) {
  const entry = entries.find((candidate) => candidate.event === eventName);
  assert(Boolean(entry), message);
  return entry;
}

async function runLoggingMatrix(baseUrl) {
  const infoRun = await withClient({
    TESTOPS_URL: baseUrl,
    TESTOPS_TOKEN: 'fake-api-token',
    TESTOPS_PROJECT_ID: 1,
    TESTOPS_LOG_LEVEL: 'info',
    TESTOPS_LOG_FORMAT: 'json',
  }, async (client) => {
    await client.callTool({ name: 'list-projects', arguments: {} });
  });

  const infoEntries = parseJsonStderr(infoRun.stderr);
  const serverStarting = requireEvent(infoEntries, 'server.starting', 'info logs must include server.starting');
  const toolStart = requireEvent(infoEntries, 'tool.start', 'info logs must include tool.start');
  const httpSuccess = requireEvent(infoEntries, 'http.request.success', 'info logs must include http.request.success');
  const toolSuccess = requireEvent(infoEntries, 'tool.success', 'info logs must include tool.success');

  requireField(serverStarting, 'ts', 'server.starting must include ts');
  requireField(serverStarting, 'level', 'server.starting must include level');
  requireField(toolStart, 'toolName', 'tool.start must include toolName');
  requireField(toolStart, 'toolRequestId', 'tool.start must include toolRequestId');
  requireField(httpSuccess, 'requestId', 'http.request.success must include requestId');
  requireField(httpSuccess, 'method', 'http.request.success must include method');
  requireField(httpSuccess, 'path', 'http.request.success must include path');
  requireField(httpSuccess, 'status', 'http.request.success must include status');
  requireField(httpSuccess, 'durationMs', 'http.request.success must include durationMs');
  requireField(httpSuccess, 'toolRequestId', 'http.request.success must include toolRequestId');
  requireField(toolSuccess, 'durationMs', 'tool.success must include durationMs');

  assert(toolStart.toolRequestId === httpSuccess.toolRequestId, 'tool and http success events must share toolRequestId');
  assert(toolStart.toolRequestId === toolSuccess.toolRequestId, 'tool start and success must share toolRequestId');
  assertSecretsAbsent(infoRun.stderr, ['fake-api-token', 'stable-token']);

  const debugServer = await startFakeTestOpsServer({
    authTokens: ['expired-token', 'fresh-token'],
    rejectFirstProjectToken: 'expired-token',
  });

  try {
    const debugRun = await withClient({
      TESTOPS_URL: debugServer.baseUrl,
      TESTOPS_TOKEN: 'fake-api-token',
      TESTOPS_LOG_LEVEL: 'debug',
      TESTOPS_LOG_FORMAT: 'pretty',
    }, async (client) => {
      await client.callTool({ name: 'list-projects', arguments: {} });
    });

    assert(debugRun.stderr.includes('http.request.start'), 'debug logs must include http.request.start');
    assert(debugRun.stderr.includes('http.auth.refresh'), 'debug logs must include auth refresh details');
    assert(debugRun.stderr.includes('auth.fetch.success'), 'debug logs must include auth success details');
    assert(debugRun.stderr.includes('toolRequestId='), 'debug logs must include toolRequestId');
    assert(debugRun.stderr.includes('requestId='), 'debug logs must include requestId');
    assertSecretsAbsent(debugRun.stderr, ['fake-api-token', 'expired-token', 'fresh-token']);
  } finally {
    await debugServer.stop();
  }

  const errorServer = await startFakeTestOpsServer({
    projectFailureStatus: 503,
    projectFailureBody: 'matrix failure',
  });

  try {
    const errorRun = await withClient({
      TESTOPS_URL: errorServer.baseUrl,
      TESTOPS_TOKEN: 'fake-api-token',
      TESTOPS_LOG_LEVEL: 'error',
      TESTOPS_LOG_FORMAT: 'json',
    }, async (client) => {
      const result = await client.callTool({ name: 'list-projects', arguments: {} });
      assert(result.isError === true, 'error-level logging scenario must still surface tool failure');
    });

    const errorEntries = parseJsonStderr(errorRun.stderr);
    assert(errorEntries.every((entry) => entry.level === 'error'), 'error-level logs must only contain error entries');
    const httpRejected = requireEvent(errorEntries, 'http.request.rejected', 'error-level logs must include http.request.rejected');
    const toolError = requireEvent(errorEntries, 'tool.error', 'error-level logs must include tool.error');
    requireField(httpRejected, 'requestId', 'http.request.rejected must include requestId');
    requireField(httpRejected, 'status', 'http.request.rejected must include status');
    requireField(httpRejected, 'toolRequestId', 'http.request.rejected must include toolRequestId');
    requireField(toolError, 'toolRequestId', 'tool.error must include toolRequestId');
    requireField(toolError, 'durationMs', 'tool.error must include durationMs');
    assert(httpRejected.toolRequestId === toolError.toolRequestId, 'http.request.rejected and tool.error must share toolRequestId');
    assertSecretsAbsent(errorRun.stderr, ['fake-api-token', 'stable-token']);
  } finally {
    await errorServer.stop();
  }
}

async function runNegativeMatrix(baseUrl) {
  await withClient({
    TESTOPS_URL: baseUrl,
    TESTOPS_TOKEN: 'fake-api-token',
    TESTOPS_PROJECT_ID: 1,
  }, async (client) => {
    const missingCase = await client.callTool({ name: 'get-test-case', arguments: { id: 99999 } });
    assert(missingCase.isError === true, 'missing test case must surface as tool error');
    assert(extractText(missingCase).includes('404'), 'missing test case must include 404');

    const invalidCaseCreate = await client.callTool({
      name: 'create-test-case',
      arguments: { projectId: 1, name: '' },
    });
    assert(invalidCaseCreate.isError === true, 'invalid test case create must fail');
    assert(extractText(invalidCaseCreate).includes('400'), 'invalid test case create must include 400');

    const invalidScenario = await client.callTool({
      name: 'update-test-case-scenario',
      arguments: { id: 11, steps: [{ keyword: 'Given', name: '' }] },
    });
    assert(invalidScenario.isError === true, 'invalid scenario update must fail');
    assert(extractText(invalidScenario).includes('400'), 'invalid scenario update must include 400');

    const invalidCustomFields = await client.callTool({
      name: 'set-test-case-custom-fields',
      arguments: {
        id: 11,
        projectId: 1,
        fields: [{ id: 12, name: 'Broken field', customField: { id: 0 } }],
      },
    });
    assert(invalidCustomFields.isError === true, 'invalid custom field update must fail');
    assert(extractText(invalidCustomFields).includes('400'), 'invalid custom field update must include 400');

    const invalidPlanCreate = await client.callTool({
      name: 'create-test-plan',
      arguments: { projectId: 1, name: '' },
    });
    assert(invalidPlanCreate.isError === true, 'invalid test plan create must fail');
    assert(extractText(invalidPlanCreate).includes('400'), 'invalid test plan create must include 400');

    const invalidResultUpdate = await client.callTool({
      name: 'update-test-result',
      arguments: { id: 41, status: 'flaky' },
    });
    assert(invalidResultUpdate.isError === true, 'invalid test result update must fail');
    assert(extractText(invalidResultUpdate).includes('400'), 'invalid test result update must include 400');

    const invalidDefectCreate = await client.callTool({
      name: 'create-defect',
      arguments: { projectId: 1, name: '' },
    });
    assert(invalidDefectCreate.isError === true, 'invalid defect create must fail');
    assert(extractText(invalidDefectCreate).includes('400'), 'invalid defect create must include 400');
  });
}

async function main() {
  const happyServer = await startFakeTestOpsServer();

  try {
    await runHappyPathMatrix(happyServer.baseUrl);
    await runNegativeMatrix(happyServer.baseUrl);
    await runReadOnlyMatrix(happyServer.baseUrl);
    await runLoggingMatrix(happyServer.baseUrl);
  } finally {
    await happyServer.stop();
  }

  console.log('Matrix eval passed.');
}

main().catch((error) => {
  console.error(`eval:matrix failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
