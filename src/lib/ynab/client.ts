import type {
  YnabAccount,
  YnabBudget,
  YnabBudgetSnapshot,
  YnabCategoryGroup,
  YnabTransaction
} from './types';
import { debugFetch } from '$lib/debug';

const API_BASE = 'https://api.ynab.com/v1';
export const DEFAULT_BUDGET_ID = 'default';

export type YnabErrorCode =
  | 'reconnect-required'
  | 'rate-limited'
  | 'network-unavailable'
  | 'budget-unavailable'
  | 'fetch-error';

export class YnabClientError extends Error {
  constructor(
    public code: YnabErrorCode,
    message: string
  ) {
    super(message);
  }
}

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
    throw new YnabClientError('network-unavailable', 'Network unavailable.');
  }

  debugFetch('request:response', {
    path,
    status: response.status,
    ok: response.ok
  });

  if (response.status === 401 || response.status === 403) {
    throw new YnabClientError('reconnect-required', 'Reconnect YNAB.');
  }

  if (response.status === 404) {
    throw new YnabClientError('budget-unavailable', 'Budget unavailable.');
  }

  if (response.status === 429) {
    throw new YnabClientError('rate-limited', 'YNAB rate limit reached.');
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
    throw new YnabClientError('fetch-error', `YNAB request failed (${response.status}).`);
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

export async function fetchBudgetSnapshot(
  token: string,
  budgetId: string
): Promise<YnabBudgetSnapshot> {
  debugFetch('snapshot:start', { budgetId });
  const [budgetResponse, accountsResponse, categoriesResponse, transactionsResponse] =
    await Promise.all([
      ynabFetch<{ data: { budget: YnabBudget; server_knowledge?: number } }>(
        token,
        `/budgets/${budgetId}`
      ),
      ynabFetch<{ data: { accounts: YnabAccount[]; server_knowledge?: number } }>(
        token,
        `/budgets/${budgetId}/accounts`
      ),
      ynabFetch<{ data: { category_groups: YnabCategoryGroup[]; server_knowledge?: number } }>(
        token,
        `/budgets/${budgetId}/categories`
      ),
      ynabFetch<{ data: { transactions: YnabTransaction[]; server_knowledge?: number } }>(
        token,
        `/budgets/${budgetId}/transactions`
      )
    ]);

  const snapshot = {
    budget: budgetResponse.data.budget,
    budgets: [],
    accounts: accountsResponse.data.accounts.filter((account) => !account.deleted),
    categoryGroups: categoriesResponse.data.category_groups,
    transactions: transactionsResponse.data.transactions.filter(
      (transaction) => !transaction.deleted
    ),
    serverKnowledge:
      transactionsResponse.data.server_knowledge ??
      categoriesResponse.data.server_knowledge ??
      accountsResponse.data.server_knowledge ??
      budgetResponse.data.server_knowledge ??
      null
  };

  debugFetch('snapshot:success', {
    budgetId,
    budgetName: snapshot.budget?.name,
    accounts: snapshot.accounts.length,
    categoryGroups: snapshot.categoryGroups.length,
    transactions: snapshot.transactions.length,
    serverKnowledge: snapshot.serverKnowledge
  });

  return snapshot;
}
