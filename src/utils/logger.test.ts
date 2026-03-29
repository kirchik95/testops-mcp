const mockConfig = vi.hoisted(() => ({
  logLevel: 'debug',
  logFormat: 'json',
}));

vi.mock('../config.js', () => ({
  config: mockConfig,
}));

describe('logger', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('writes JSON logs and redacts token-like fields', async () => {
    const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const { logEvent } = await import('./logger.js');

    logEvent('info', 'http.request.success', {
      token: 'super-secret',
      status: 200,
    });

    expect(writeSpy).toHaveBeenCalledOnce();
    const line = String(writeSpy.mock.calls[0][0]).trim();
    const parsed = JSON.parse(line);
    expect(parsed.event).toBe('http.request.success');
    expect(parsed.status).toBe(200);
    expect(parsed.token).toBe('[REDACTED]');
    writeSpy.mockRestore();
  });

  it('skips logs below the configured level', async () => {
    mockConfig.logLevel = 'error';
    const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const { logEvent } = await import('./logger.js');

    logEvent('info', 'tool.start', { toolName: 'list-projects' });

    expect(writeSpy).not.toHaveBeenCalled();
    writeSpy.mockRestore();
    mockConfig.logLevel = 'debug';
  });

  it('formats pretty logs when configured', async () => {
    mockConfig.logFormat = 'pretty';
    const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const { logEvent } = await import('./logger.js');

    logEvent('error', 'server.fatal', { reason: 'boom' });

    const line = String(writeSpy.mock.calls[0][0]);
    expect(line).toContain('[error] server.fatal');
    expect(line).toContain('reason="boom"');
    writeSpy.mockRestore();
    mockConfig.logFormat = 'json';
  });
});
