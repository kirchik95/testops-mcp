import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AuthManager } from '../client/auth.js';
import { HttpClient } from '../client/http-client.js';
import { ProjectsApi } from '../api/projects.js';
import { TestCasesApi } from '../api/test-cases.js';
import { TestPlansApi } from '../api/test-plans.js';
import { LaunchesApi } from '../api/launches.js';
import { TestResultsApi } from '../api/test-results.js';
import { DefectsApi } from '../api/defects.js';
import { AnalyticsApi } from '../api/analytics.js';
import { ReferenceDataApi } from '../api/reference-data.js';
import { registerProjectTools } from './projects.js';
import { registerTestCaseTools } from './test-cases.js';
import { registerTestPlanTools } from './test-plans.js';
import { registerLaunchTools } from './launches.js';
import { registerTestResultTools } from './test-results.js';
import { registerDefectTools } from './defects.js';
import { registerAnalyticsTools } from './analytics.js';
import { registerReferenceDataTools } from './reference-data.js';
import { config } from '../config.js';

export function registerAllTools(server: McpServer): void {
  const auth = new AuthManager();
  const http = new HttpClient(auth);
  const readOnly = config.readOnly;

  const projectsApi = new ProjectsApi(http);
  const testCasesApi = new TestCasesApi(http);
  const testPlansApi = new TestPlansApi(http);
  const launchesApi = new LaunchesApi(http);
  const testResultsApi = new TestResultsApi(http);
  const defectsApi = new DefectsApi(http);
  const analyticsApi = new AnalyticsApi(http);
  const referenceDataApi = new ReferenceDataApi(http);

  registerProjectTools(server, projectsApi);
  registerTestCaseTools(server, testCasesApi, readOnly);
  registerTestPlanTools(server, testPlansApi, readOnly);
  registerLaunchTools(server, launchesApi);
  registerTestResultTools(server, testResultsApi, readOnly);
  registerDefectTools(server, defectsApi, readOnly);
  registerAnalyticsTools(server, analyticsApi);
  registerReferenceDataTools(server, referenceDataApi);
}
