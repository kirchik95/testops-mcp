import { HttpClient } from './http-client.js';
import type { AuthManager } from './auth.js';

const mockConfig = vi.hoisted(() => ({
  testopsUrl: 'https://testops.example.com',
  testopsToken: 'tok',
  pageSize: undefined as number | undefined,
  timeoutMs: 100,
  retryMax: 2,
  retryBaseMs: 1,
  logLevel: 'error',
  logFormat: 'json',
}));

vi.mock('../config.js', () => ({
  config: mockConfig,
}));

function createMockAuth(token = 'test-bearer-token'): AuthManager {
  return {
    getAccessToken: vi.fn().mockResolvedValue(token),
    invalidate: vi.fn(),
  } as unknown as AuthManager;
}

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: true,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

describe('HttpClient', () => {
  let mockAuth: AuthManager;
  let client: HttpClient;
  let fetchMock: ReturnType<typeof vi.fn>;
  let stderrWriteSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockAuth = createMockAuth();
    client = new HttpClient(mockAuth);
    fetchMock = vi.fn().mockResolvedValue(jsonResponse({ result: 'ok' }));
    global.fetch = fetchMock as typeof fetch;
    mockConfig.pageSize = undefined;
    mockConfig.timeoutMs = 100;
    mockConfig.retryMax = 2;
    mockConfig.retryBaseMs = 1;
    stderrWriteSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrWriteSpy.mockRestore();
  });

  describe('GET', () => {
    it('builds correct URL with query params and sets auth header', async () => {
      await client.get('/api/items', { page: 0, search: 'test' });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://testops.example.com/api/items?page=0&search=test');
      expect(init.method).toBe('GET');

      const headers = new Headers(init.headers);
      expect(headers.get('Authorization')).toBe('Bearer test-bearer-token');
    });

    it('auto-adds pageSize when config.pageSize is set and params lack size', async () => {
      mockConfig.pageSize = 50;

      await client.get('/api/items', { page: 0 });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('size=50');
    });

    it('does not override explicit size param with config.pageSize', async () => {
      mockConfig.pageSize = 50;

      await client.get('/api/items', { page: 0, size: 10 });

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('size=10');
      expect(url).not.toContain('size=50');
    });
  });

  describe('POST', () => {
    it('sends JSON body with Content-Type header', async () => {
      const body = { name: 'new item' };
      await client.post('/api/items', body);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://testops.example.com/api/items');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify(body));

      const headers = new Headers(init.headers);
      expect(headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('PATCH', () => {
    it('sends JSON body with correct method', async () => {
      const body = { name: 'updated' };
      await client.patch('/api/items/1', body);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://testops.example.com/api/items/1');
      expect(init.method).toBe('PATCH');
      expect(init.body).toBe(JSON.stringify(body));
    });
  });

  describe('DELETE', () => {
    it('sends DELETE method', async () => {
      await client.delete('/api/items/1');

      const [, init] = fetchMock.mock.calls[0];
      expect(init.method).toBe('DELETE');
    });
  });

  describe('query params', () => {
    it('skips undefined values', async () => {
      await client.get('/api/items', { page: 0, filter: undefined, active: true });

      const [url] = fetchMock.mock.calls[0];
      const parsed = new URL(url);
      expect(parsed.searchParams.get('page')).toBe('0');
      expect(parsed.searchParams.has('filter')).toBe(false);
      expect(parsed.searchParams.get('active')).toBe('true');
    });
  });

  describe('401 retry', () => {
    it('invalidates token and retries on 401, succeeds on retry', async () => {
      const auth = createMockAuth();
      (auth.getAccessToken as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce('expired-token')
        .mockResolvedValueOnce('fresh-token');
      const localClient = new HttpClient(auth);

      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 401, text: async () => 'Unauthorized' })
        .mockResolvedValueOnce(jsonResponse({ success: true }));
      global.fetch = fetchMock as typeof fetch;

      const result = await localClient.get('/api/data');

      expect(auth.invalidate).toHaveBeenCalledOnce();
      expect(result).toEqual({ success: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not retry infinitely on persistent 401', async () => {
      const auth = createMockAuth();
      const localClient = new HttpClient(auth);

      fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' });
      global.fetch = fetchMock as typeof fetch;

      await expect(localClient.get('/api/data')).rejects.toThrow(
        /API error 401 GET.*\/api\/data: Unauthorized/,
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('204 No Content', () => {
    it('returns undefined', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 204 });
      global.fetch = fetchMock as typeof fetch;

      const result = await client.delete('/api/items/1');

      expect(result).toBeUndefined();
    });
  });

  describe('error response', () => {
    it('throws error with status, method, url, and body', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });
      global.fetch = fetchMock as typeof fetch;

      await expect(client.get('/api/items')).rejects.toThrow(
        'API error 500 GET https://testops.example.com/api/items: Internal Server Error',
      );
    });

    it('retries retriable GET responses before failing', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'Service Unavailable' })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ result: 'recovered' }) });
      global.fetch = fetchMock as typeof fetch;

      await expect(client.get('/api/items')).resolves.toEqual({ result: 'recovered' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not retry non-GET requests on 5xx responses', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      });
      global.fetch = fetchMock as typeof fetch;

      await expect(client.post('/api/items', { name: 'x' })).rejects.toThrow(
        'API error 503 POST https://testops.example.com/api/items: Service Unavailable',
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('throws a readable timeout error when the request is aborted', async () => {
      vi.useFakeTimers();
      mockConfig.retryMax = 0;
      fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted', 'AbortError'));
        });
      }));
      global.fetch = fetchMock as typeof fetch;

      const requestExpectation = expect(client.get('/api/items')).rejects.toThrow(
        'Request timed out after 100ms for GET https://testops.example.com/api/items',
      );
      await vi.advanceTimersByTimeAsync(101);

      await requestExpectation;
      vi.useRealTimers();
    });

    it('throws when a successful response contains invalid JSON', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      });
      global.fetch = fetchMock as typeof fetch;

      await expect(client.get('/api/items')).rejects.toThrow(
        'Invalid JSON response for GET https://testops.example.com/api/items: Unexpected token <',
      );
    });
  });

  describe('URL building', () => {
    it('correctly joins base URL with path', async () => {
      await client.get('/api/v1/projects');

      const [url] = fetchMock.mock.calls[0];
      expect(url).toBe('https://testops.example.com/api/v1/projects');
    });
  });
});
