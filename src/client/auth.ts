import { config } from '../config.js';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export class AuthManager {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private pendingToken: Promise<string> | null = null;

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }
    if (!this.pendingToken) {
      this.pendingToken = this.fetchToken().finally(() => {
        this.pendingToken = null;
      });
    }
    return this.pendingToken;
  }

  invalidate(): void {
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  private async fetchToken(): Promise<string> {
    const url = `${config.testopsUrl}/api/uaa/oauth/token`;
    const body = new URLSearchParams({
      grant_type: 'apitoken',
      scope: 'openid',
      token: config.testopsToken,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Auth failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as TokenResponse;
    this.accessToken = data.access_token;
    const expiresIn = data.expires_in ?? 3600;
    this.tokenExpiresAt = Date.now() + (expiresIn - 300) * 1000;
    return this.accessToken;
  }
}
