import { getYnabErrorCode, YnabClientError } from '$lib/ynab/errors';

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
