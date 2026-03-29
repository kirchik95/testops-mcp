import { config } from '../config.js';
import { createRequestId, logEvent } from '../utils/logger.js';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
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

export class AuthManager {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private pendingToken: Promise<string> | null = null;

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      logEvent('debug', 'auth.cache_hit');
      return this.accessToken;
    }
    if (!this.pendingToken) {
      this.pendingToken = this.fetchToken().finally(() => {
        this.pendingToken = null;
      });
    } else {
      logEvent('debug', 'auth.await_pending');
    }
    return this.pendingToken;
  }

  invalidate(): void {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  private async fetchToken(): Promise<string> {
    const authRequestId = createRequestId('auth');
    const url = `${config.testopsUrl}/api/uaa/oauth/token`;
    const body = new URLSearchParams({
      grant_type: 'apitoken',
      scope: 'openid',
      token: config.testopsToken,
    });
    const startedAt = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    logEvent('debug', 'auth.fetch.start', {
      authRequestId,
      path: '/api/uaa/oauth/token',
    });

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: controller.signal,
      });
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      if (isAbortError(error)) {
        logEvent('error', 'auth.fetch.timeout', {
          authRequestId,
          durationMs,
        });
        throw new Error(`Auth request timed out after ${config.timeoutMs}ms`, { cause: error });
      }
      logEvent('error', 'auth.fetch.failed', {
        authRequestId,
        durationMs,
        error,
      });
      throw new Error(`Auth request failed: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const text = await readErrorText(response);
      logEvent('error', 'auth.fetch.rejected', {
        authRequestId,
        durationMs: Date.now() - startedAt,
        status: response.status,
        message: text,
      });
      throw new Error(`Auth failed (${response.status}): ${text}`);
    }

    let data: TokenResponse;
    try {
      data = (await response.json()) as TokenResponse;
    } catch (error) {
      throw new Error(`Auth response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }

    if (!data.access_token || typeof data.access_token !== 'string') {
      throw new Error('Auth response missing a valid access_token');
    }

    if (data.expires_in !== undefined && (!Number.isFinite(data.expires_in) || data.expires_in <= 0)) {
      throw new Error('Auth response has an invalid expires_in value');
    }

    this.accessToken = data.access_token;
    const expiresIn = data.expires_in ?? 3600;
    this.tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;
    logEvent('info', 'auth.fetch.success', {
      authRequestId,
      durationMs: Date.now() - startedAt,
      expiresIn,
    });
    return this.accessToken;
  }
}
