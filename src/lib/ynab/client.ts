import { YnabClientError } from './errors';
import type { YnabBudget } from './types';

const API_BASE = 'https://api.ynab.com/v1';
export const DEFAULT_BUDGET_ID = 'default';
export type { YnabErrorCode } from './errors';
export { YnabClientError } from './errors';

export async function ynabFetch<T>(token: string, path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { authorization: `Bearer ${token}` }
    });
  } catch {
    throw new YnabClientError({
      code: 'network-unavailable',
      message: 'Network unavailable.',
      status: null
    });
  }

  if (response.status === 401 || response.status === 403) {
    throw new YnabClientError({
      code: 'reconnect-required',
      message: 'Reconnect YNAB.',
      status: response.status
    });
  }

  if (response.status === 404) {
    throw new YnabClientError({
      code: 'budget-unavailable',
      message: 'Budget unavailable.',
      status: response.status
    });
  }

  if (response.status === 429) {
    throw new YnabClientError({
      code: 'rate-limited',
      message: 'YNAB rate limit reached.',
      status: response.status,
      retryAfterSeconds: parseRetryAfter(response.headers.get('retry-after'))
    });
  }

  if (!response.ok) {
    throw new YnabClientError({
      code: 'fetch-error',
      message: `YNAB request failed (${response.status}).`,
      status: response.status
    });
  }

  const body = (await response.json()) as T;
  return body;
}

export async function fetchBudgets(token: string) {
  const response = await ynabFetch<{ data: { budgets: YnabBudget[] } }>(token, '/budgets');
  return response.data.budgets;
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;

  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}
