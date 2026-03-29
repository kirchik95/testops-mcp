import { AuthManager } from './auth.js';

vi.mock('../config.js', () => ({
  config: {
    testopsUrl: 'https://testops.example.com',
    testopsToken: 'my-api-token',
    timeoutMs: 50,
  },
}));

function mockFetchSuccess(accessToken = 'access-token-123', expiresIn = 3600) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ access_token: accessToken, token_type: 'bearer', expires_in: expiresIn }),
  });
}

describe('AuthManager', () => {
  let auth: AuthManager;

  beforeEach(() => {
    auth = new AuthManager();
  });

  describe('fetchToken', () => {
    it('calls correct URL and body params, returns access_token', async () => {
      const fetchMock = mockFetchSuccess();
      global.fetch = fetchMock;

      const token = await auth.getAccessToken();

      expect(token).toBe('access-token-123');
      expect(fetchMock).toHaveBeenCalledOnce();

      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://testops.example.com/api/uaa/oauth/token');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

      const body = new URLSearchParams(options.body);
      expect(body.get('grant_type')).toBe('apitoken');
      expect(body.get('scope')).toBe('openid');
      expect(body.get('token')).toBe('my-api-token');
    });
  });

  describe('token caching', () => {
    it('second call returns cached token without fetching again', async () => {
      const fetchMock = mockFetchSuccess();
      global.fetch = fetchMock;

      const token1 = await auth.getAccessToken();
      const token2 = await auth.getAccessToken();

      expect(token1).toBe('access-token-123');
      expect(token2).toBe('access-token-123');
      expect(fetchMock).toHaveBeenCalledOnce();
    });
  });

  describe('token expiry', () => {
    it('fetches again after token expires', async () => {
      vi.useFakeTimers();
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token-1', token_type: 'bearer', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token-2', token_type: 'bearer', expires_in: 3600 }),
        });
      global.fetch = fetchMock;

      const token1 = await auth.getAccessToken();
      expect(token1).toBe('token-1');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // expires_in=3600, buffer=300 → expires at (3600-300)*1000 = 3_300_000ms
      vi.advanceTimersByTime(3_300_001);

      const token2 = await auth.getAccessToken();
      expect(token2).toBe('token-2');
      expect(fetchMock).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('invalidate', () => {
    it('clears cache so next call fetches new token', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'old-token', token_type: 'bearer', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'new-token', token_type: 'bearer', expires_in: 3600 }),
        });
      global.fetch = fetchMock;

      const token1 = await auth.getAccessToken();
      expect(token1).toBe('old-token');

      auth.invalidate();

      const token2 = await auth.getAccessToken();
      expect(token2).toBe('new-token');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('race condition protection', () => {
    it('3 concurrent calls with expired token result in only 1 fetch', async () => {
      const fetchMock = mockFetchSuccess('shared-token');
      global.fetch = fetchMock;

      const [t1, t2, t3] = await Promise.all([
        auth.getAccessToken(),
        auth.getAccessToken(),
        auth.getAccessToken(),
      ]);

      expect(t1).toBe('shared-token');
      expect(t2).toBe('shared-token');
      expect(t3).toBe('shared-token');
      expect(fetchMock).toHaveBeenCalledOnce();
    });
  });

  describe('auth failure', () => {
    it('throws error with status and body when response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(auth.getAccessToken()).rejects.toThrow('Auth failed (401): Unauthorized');
    });

    it('throws when the auth response is not valid JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      });

      await expect(auth.getAccessToken()).rejects.toThrow('Auth response was not valid JSON');
    });

    it('throws when access_token is missing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token_type: 'bearer', expires_in: 3600 }),
      });

      await expect(auth.getAccessToken()).rejects.toThrow('Auth response missing a valid access_token');
    });

    it('throws a timeout error when the auth request is aborted', async () => {
      vi.useFakeTimers();
      global.fetch = vi.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted', 'AbortError'));
        });
      }));

      const tokenExpectation = expect(auth.getAccessToken()).rejects.toThrow('Auth request timed out after 50ms');
      await vi.advanceTimersByTimeAsync(51);

      await tokenExpectation;
      vi.useRealTimers();
    });
  });
});
