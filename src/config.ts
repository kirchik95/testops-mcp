export const config = {
  testopsUrl: process.env.TESTOPS_URL || '',
  testopsToken: process.env.TESTOPS_TOKEN || '',
  projectId: process.env.TESTOPS_PROJECT_ID ? parseInt(process.env.TESTOPS_PROJECT_ID, 10) : undefined,
  pageSize: process.env.TESTOPS_PAGE_SIZE ? parseInt(process.env.TESTOPS_PAGE_SIZE, 10) : undefined,
  readOnly: process.env.TESTOPS_READ_ONLY === 'true',
};

export function resolveProjectId(argsProjectId: number | undefined): number {
  const projectId = argsProjectId ?? config.projectId;
  if (projectId === undefined) {
    throw new Error('projectId is required. Either pass it as a parameter or set TESTOPS_PROJECT_ID environment variable.');
  }
  return projectId;
}

export function validateConfig(): void {
  if (!config.testopsUrl) throw new Error('TESTOPS_URL environment variable is required');
  if (!config.testopsToken) throw new Error('TESTOPS_TOKEN environment variable is required');
}
