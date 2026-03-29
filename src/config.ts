function parseOptionalIntegerEnv(name: string, min: number): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;

  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} must be an integer >= ${min}`);
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(value) || value < min) {
    throw new Error(`${name} must be an integer >= ${min}`);
  }

  return value;
}

function parseBooleanEnv(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === '') return defaultValue;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`${name} must be either "true" or "false"`);
}

function parseEnumEnv<const T extends readonly string[]>(
  name: string,
  allowedValues: T,
  defaultValue: T[number],
): T[number] {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === '') return defaultValue;
  if (allowedValues.includes(raw)) return raw as T[number];
  throw new Error(`${name} must be one of: ${allowedValues.join(', ')}`);
}

export const config = {
  testopsUrl: process.env.TESTOPS_URL?.trim() || '',
  testopsToken: process.env.TESTOPS_TOKEN?.trim() || '',
  projectId: parseOptionalIntegerEnv('TESTOPS_PROJECT_ID', 1),
  pageSize: parseOptionalIntegerEnv('TESTOPS_PAGE_SIZE', 1),
  readOnly: parseBooleanEnv('TESTOPS_READ_ONLY', false),
  timeoutMs: parseOptionalIntegerEnv('TESTOPS_TIMEOUT_MS', 1) ?? 30_000,
  retryMax: parseOptionalIntegerEnv('TESTOPS_RETRY_MAX', 0) ?? 2,
  retryBaseMs: parseOptionalIntegerEnv('TESTOPS_RETRY_BASE_MS', 1) ?? 250,
  logLevel: parseEnumEnv('TESTOPS_LOG_LEVEL', ['error', 'info', 'debug'] as const, 'error'),
  logFormat: parseEnumEnv('TESTOPS_LOG_FORMAT', ['json', 'pretty'] as const, 'json'),
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
  try {
    const url = new URL(config.testopsUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
  } catch {
    throw new Error('TESTOPS_URL must be a valid http(s) URL');
  }
}
