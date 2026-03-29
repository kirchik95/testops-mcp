describe('config module', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function loadConfig() {
    return import('./config.js');
  }

  describe('validateConfig', () => {
    it('throws when TESTOPS_URL is empty', async () => {
      vi.stubEnv('TESTOPS_URL', '');
      vi.stubEnv('TESTOPS_TOKEN', 'some-token');
      const { validateConfig } = await loadConfig();
      expect(() => validateConfig()).toThrow('TESTOPS_URL environment variable is required');
    });

    it('throws when TESTOPS_TOKEN is empty', async () => {
      vi.stubEnv('TESTOPS_URL', 'https://example.com');
      vi.stubEnv('TESTOPS_TOKEN', '');
      const { validateConfig } = await loadConfig();
      expect(() => validateConfig()).toThrow('TESTOPS_TOKEN environment variable is required');
    });

    it('passes when both TESTOPS_URL and TESTOPS_TOKEN are set', async () => {
      vi.stubEnv('TESTOPS_URL', 'https://example.com');
      vi.stubEnv('TESTOPS_TOKEN', 'my-token');
      const { validateConfig } = await loadConfig();
      expect(() => validateConfig()).not.toThrow();
    });

    it('throws when TESTOPS_URL is not a valid http(s) URL', async () => {
      vi.stubEnv('TESTOPS_URL', 'ftp://example.com');
      vi.stubEnv('TESTOPS_TOKEN', 'my-token');
      const { validateConfig } = await loadConfig();
      expect(() => validateConfig()).toThrow('TESTOPS_URL must be a valid http(s) URL');
    });
  });

  describe('resolveProjectId', () => {
    it('returns argsProjectId when provided', async () => {
      vi.stubEnv('TESTOPS_URL', 'https://example.com');
      vi.stubEnv('TESTOPS_TOKEN', 'tok');
      vi.stubEnv('TESTOPS_PROJECT_ID', '10');
      const { resolveProjectId } = await loadConfig();
      expect(resolveProjectId(42)).toBe(42);
    });

    it('returns config.projectId when argsProjectId is undefined', async () => {
      vi.stubEnv('TESTOPS_URL', 'https://example.com');
      vi.stubEnv('TESTOPS_TOKEN', 'tok');
      vi.stubEnv('TESTOPS_PROJECT_ID', '99');
      const { resolveProjectId } = await loadConfig();
      expect(resolveProjectId(undefined)).toBe(99);
    });

    it('throws when both argsProjectId and config.projectId are undefined', async () => {
      vi.stubEnv('TESTOPS_URL', 'https://example.com');
      vi.stubEnv('TESTOPS_TOKEN', 'tok');
      const { resolveProjectId } = await loadConfig();
      expect(() => resolveProjectId(undefined)).toThrow('projectId is required');
    });
  });

  describe('config object', () => {
    it('parses TESTOPS_PROJECT_ID as number', async () => {
      vi.stubEnv('TESTOPS_PROJECT_ID', '123');
      const { config } = await loadConfig();
      expect(config.projectId).toBe(123);
    });

    it('parses TESTOPS_PAGE_SIZE as number', async () => {
      vi.stubEnv('TESTOPS_PAGE_SIZE', '50');
      const { config } = await loadConfig();
      expect(config.pageSize).toBe(50);
    });

    it('parses TESTOPS_READ_ONLY as boolean true', async () => {
      vi.stubEnv('TESTOPS_READ_ONLY', 'true');
      const { config } = await loadConfig();
      expect(config.readOnly).toBe(true);
    });

    it('parses TESTOPS_READ_ONLY as boolean false for other values', async () => {
      vi.stubEnv('TESTOPS_READ_ONLY', 'false');
      const { config } = await loadConfig();
      expect(config.readOnly).toBe(false);
    });

    it('exposes default timeout and retry settings when env vars are absent', async () => {
      const { config } = await loadConfig();
      expect(config.timeoutMs).toBe(30_000);
      expect(config.retryMax).toBe(2);
      expect(config.retryBaseMs).toBe(250);
      expect(config.logLevel).toBe('error');
      expect(config.logFormat).toBe('json');
    });

    it('parses timeout and retry env vars', async () => {
      vi.stubEnv('TESTOPS_TIMEOUT_MS', '1500');
      vi.stubEnv('TESTOPS_RETRY_MAX', '4');
      vi.stubEnv('TESTOPS_RETRY_BASE_MS', '75');
      vi.stubEnv('TESTOPS_LOG_LEVEL', 'debug');
      vi.stubEnv('TESTOPS_LOG_FORMAT', 'pretty');
      const { config } = await loadConfig();
      expect(config.timeoutMs).toBe(1500);
      expect(config.retryMax).toBe(4);
      expect(config.retryBaseMs).toBe(75);
      expect(config.logLevel).toBe('debug');
      expect(config.logFormat).toBe('pretty');
    });

    it('leaves projectId undefined when env var is not set', async () => {
      const { config } = await loadConfig();
      expect(config.projectId).toBeUndefined();
    });

    it('throws on invalid numeric env vars during module load', async () => {
      vi.stubEnv('TESTOPS_PAGE_SIZE', 'abc');
      await expect(loadConfig()).rejects.toThrow('TESTOPS_PAGE_SIZE must be an integer >= 1');
    });

    it('throws on invalid boolean env vars during module load', async () => {
      vi.stubEnv('TESTOPS_READ_ONLY', 'yes');
      await expect(loadConfig()).rejects.toThrow('TESTOPS_READ_ONLY must be either "true" or "false"');
    });

    it('throws on invalid log level env vars during module load', async () => {
      vi.stubEnv('TESTOPS_LOG_LEVEL', 'verbose');
      await expect(loadConfig()).rejects.toThrow('TESTOPS_LOG_LEVEL must be one of: error, info, debug');
    });

    it('throws on invalid log format env vars during module load', async () => {
      vi.stubEnv('TESTOPS_LOG_FORMAT', 'yaml');
      await expect(loadConfig()).rejects.toThrow('TESTOPS_LOG_FORMAT must be one of: json, pretty');
    });
  });
});
