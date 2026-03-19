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

    it('leaves projectId undefined when env var is not set', async () => {
      const { config } = await loadConfig();
      expect(config.projectId).toBeUndefined();
    });
  });
});
