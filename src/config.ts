export const config = {
  testopsUrl: process.env.TESTOPS_URL || '',
  testopsToken: process.env.TESTOPS_TOKEN || '',
};

export function validateConfig(): void {
  if (!config.testopsUrl) throw new Error('TESTOPS_URL environment variable is required');
  if (!config.testopsToken) throw new Error('TESTOPS_TOKEN environment variable is required');
}
