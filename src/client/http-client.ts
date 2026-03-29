import { config } from '../config.js';
import { AuthManager } from './auth.js';

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function shouldRetry(method: string, attempt: number): boolean {
  return method === 'GET' && attempt < config.retryMax;
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function getRetryDelay(attempt: number): number {
  return config.retryBaseMs * (2 ** attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readErrorText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text) return '[empty response body]';
    return text.length > 1000 ? `${text.slice(0, 1000)}…` : text;
  } catch {
    // guardrails:allow-lossy-catch
    return '[unable to read response body]';
  }
}

export class HttpClient {
  private auth: AuthManager;

  constructor(auth: AuthManager) {
    this.auth = auth;
  }

  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    if (config.pageSize && params && params.size === undefined) {
      params.size = config.pageSize;
    }
    const url = this.buildUrl(path, params);
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>(url, { method: 'DELETE' });
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path, config.testopsUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }

  private async request<T>(url: string, init: RequestInit, authRetried = false, attempt = 0): Promise<T> {
    const method = (init.method ?? 'GET').toUpperCase();
    const token = await this.auth.getAccessToken();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, { ...init, headers, signal: controller.signal });
    } catch (error) {
      clearTimeout(timeout);

      if (shouldRetry(method, attempt)) {
        await sleep(getRetryDelay(attempt));
        return this.request<T>(url, init, authRetried, attempt + 1);
      }

      if (isAbortError(error)) {
        throw new Error(`Request timed out after ${config.timeoutMs}ms for ${method} ${url}`, { cause: error });
      }

      throw new Error(`Network error ${method} ${url}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }

    clearTimeout(timeout);

    if (response.status === 401 && !authRetried) {
      this.auth.invalidate();
      return this.request<T>(url, init, true, attempt);
    }

    if (!response.ok) {
      if (shouldRetry(method, attempt) && shouldRetryStatus(response.status)) {
        await sleep(getRetryDelay(attempt));
        return this.request<T>(url, init, authRetried, attempt + 1);
      }

      const text = await readErrorText(response);
      throw new Error(`API error ${response.status} ${method} ${url}: ${text}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new Error(`Invalid JSON response for ${method} ${url}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  }
}
