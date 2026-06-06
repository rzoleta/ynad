import type { YnabToken } from '$lib/ynab/auth';
import { readToken } from '$lib/ynab/auth';
import { getYnabErrorCode, YnabClientError } from '$lib/ynab/errors';

export type YnabConnectionState =
  | {
      status: 'disconnected';
      token: null;
      accessToken: null;
      expiresAt: null;
    }
  | {
      status: 'connected';
      token: YnabToken;
      accessToken: string;
      expiresAt: number | null;
    }
  | {
      status: 'expired';
      token: YnabToken;
      accessToken: null;
      expiresAt: number;
    };

export function readYnabConnectionState(now = Date.now()): YnabConnectionState {
  const token = readToken();
  if (!token) {
    return { status: 'disconnected', token: null, accessToken: null, expiresAt: null };
  }

  if (isYnabTokenExpired(token, now)) {
    return {
      status: 'expired',
      token,
      accessToken: null,
      expiresAt: token.expiresAt
    };
  }

  return {
    status: 'connected',
    token,
    accessToken: token.accessToken,
    expiresAt: token.expiresAt ?? null
  };
}

export function isYnabTokenExpired(
  token: YnabToken | null,
  now = Date.now()
): token is YnabToken & { expiresAt: number } {
  return typeof token?.expiresAt === 'number' && token.expiresAt <= now;
}

export function shouldRetryYnabQuery(failureCount: number, error: unknown) {
  const code = getYnabErrorCode(error);
  if (code === 'rate-limited' || code === 'reconnect-required' || code === 'budget-unavailable') {
    return false;
  }

  return failureCount < 1;
}

export function getRateLimitPauseUntil(error: unknown, now = Date.now()): number | null {
  if (getYnabErrorCode(error) !== 'rate-limited') return null;

  const retryAfterSeconds = error instanceof YnabClientError ? error.retryAfterSeconds : null;
  const pauseSeconds =
    typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)
      ? retryAfterSeconds
      : 60;

  return now + Math.max(0, pauseSeconds) * 1000;
}

export function isRateLimitPauseActive(pauseUntil: number | null, now = Date.now()) {
  return typeof pauseUntil === 'number' && pauseUntil > now;
}

export function formatRateLimitPause(value: number | null, now = Date.now()) {
  if (value === null || !isRateLimitPauseActive(value, now)) return null;

  const seconds = Math.ceil((value - now) / 1000);
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}
