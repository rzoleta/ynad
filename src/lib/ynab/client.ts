import { debugFetch } from '$lib/debug';
import { YnabClientError } from './errors';
import type { YnabBudget } from './types';

const API_BASE = 'https://api.ynab.com/v1';
export const DEFAULT_BUDGET_ID = 'default';
export type { YnabErrorCode } from './errors';
export { YnabClientError } from './errors';

export async function ynabFetch<T>(token: string, path: string): Promise<T> {
  let response: Response;

  debugFetch('request:start', {
    path,
    hasToken: Boolean(token),
    tokenPrefix: token ? `${token.slice(0, 6)}...` : null
  });

  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { authorization: `Bearer ${token}` }
    });
  } catch (error) {
    debugFetch('request:network-error', {
      path,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new YnabClientError({
      code: 'network-unavailable',
      message: 'Network unavailable.',
      status: null
    });
  }

  debugFetch('request:response', {
    path,
    status: response.status,
    ok: response.ok
  });

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
    let errorBody: unknown;
    try {
      errorBody = await response.clone().json();
    } catch {
      errorBody = await response
        .clone()
        .text()
        .catch(() => null);
    }
    debugFetch('request:error-body', { path, status: response.status, body: errorBody });
    throw new YnabClientError({
      code: 'fetch-error',
      message: `YNAB request failed (${response.status}).`,
      status: response.status
    });
  }

  const body = (await response.json()) as T;
  debugFetch('request:success-body', { path, body });
  return body;
}

export async function fetchBudgets(token: string) {
  debugFetch('budgets:start');
  const response = await ynabFetch<{ data: { budgets: YnabBudget[] } }>(token, '/budgets');
  debugFetch('budgets:success', {
    count: response.data.budgets.length,
    budgetIds: response.data.budgets.map((budget) => budget.id)
  });
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
