import { and, eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import { getAuth, YNAB_PROVIDER_ID } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { account } from '$lib/server/db/schema';
import { normalizeCurrencyFormat } from '$lib/domain/currency';
import type { BudgetEntity } from '$lib/domain/types';
import { YnabClientError } from '$lib/ynab/errors';
import type {
  YnabAccount,
  YnabBudget,
  YnabBudgetSnapshot,
  YnabCategoryGroup,
  YnabTransaction
} from '$lib/ynab/types';
import { readUserSettings, writeUserSettings } from './user-settings';

const API_BASE = 'https://api.ynab.com/v1';
export const DEFAULT_BUDGET_ID = 'default';
const ALL_TRANSACTIONS_SINCE_DATE = '1900-01-01';

export async function getYnabAccessToken(userId: string): Promise<string> {
  const accountRows = await getDb()
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, YNAB_PROVIDER_ID)))
    .limit(1);

  const accountId = accountRows[0]?.id;
  if (!accountId) {
    throw new YnabClientError({
      code: 'reconnect-required',
      message: 'Reconnect YNAB.',
      status: 401
    });
  }

  try {
    const response = await getAuth().api.getAccessToken({ body: { accountId, userId } });
    if (response?.accessToken) return response.accessToken;
  } catch {
    // fall through to reconnect-required
  }

  throw new YnabClientError({
    code: 'reconnect-required',
    message: 'Reconnect YNAB.',
    status: 401
  });
}

export async function ynabFetch<T>(userId: string, path: string): Promise<T> {
  const token = await getYnabAccessToken(userId);

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

  return (await response.json()) as T;
}

export async function fetchRawBudgetSnapshot(
  userId: string,
  budgetId: string
): Promise<YnabBudgetSnapshot> {
  const [
    budgetsResponse,
    budgetResponse,
    accountsResponse,
    categoriesResponse,
    transactionsResponse
  ] = await Promise.all([
    ynabFetch<{ data: { budgets: YnabBudget[] } }>(userId, '/budgets'),
    ynabFetch<{ data: { budget: YnabBudget; server_knowledge?: number } }>(
      userId,
      `/budgets/${budgetId}`
    ),
    ynabFetch<{ data: { accounts: YnabAccount[]; server_knowledge?: number } }>(
      userId,
      `/budgets/${budgetId}/accounts`
    ),
    ynabFetch<{ data: { category_groups: YnabCategoryGroup[]; server_knowledge?: number } }>(
      userId,
      `/budgets/${budgetId}/categories`
    ),
    ynabFetch<{ data: { transactions: YnabTransaction[]; server_knowledge?: number } }>(
      userId,
      `/budgets/${budgetId}/transactions?since_date=${ALL_TRANSACTIONS_SINCE_DATE}`
    )
  ]);

  return {
    budget: budgetResponse.data.budget,
    budgets: budgetsResponse.data.budgets,
    accounts: accountsResponse.data.accounts,
    categoryGroups: categoriesResponse.data.category_groups,
    transactions: transactionsResponse.data.transactions,
    serverKnowledge:
      transactionsResponse.data.server_knowledge ??
      categoriesResponse.data.server_knowledge ??
      accountsResponse.data.server_knowledge ??
      budgetResponse.data.server_knowledge ??
      null
  };
}

export type BudgetSelection = {
  budgets: BudgetEntity[];
  selectedBudgetId: string | null;
};

export async function fetchBudgetSelection(userId: string): Promise<BudgetSelection> {
  const response = await ynabFetch<{ data: { budgets: YnabBudget[] } }>(userId, '/budgets');
  const budgets: BudgetEntity[] = response.data.budgets
    .map((budget) => ({
      id: budget.id,
      name: budget.name,
      currencyFormat: normalizeCurrencyFormat(budget.currency_format)
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const settings = await readUserSettings(userId);
  const storedBudgetId = settings.selectedBudgetId?.trim() || null;
  const storedIsValid = storedBudgetId && budgets.some((budget) => budget.id === storedBudgetId);

  let selectedBudgetId = storedIsValid ? storedBudgetId : null;

  if (!selectedBudgetId && budgets.length > 0) {
    selectedBudgetId = await fetchDefaultBudgetId(userId);
    if (!selectedBudgetId || !budgets.some((budget) => budget.id === selectedBudgetId)) {
      selectedBudgetId = budgets[0]?.id ?? null;
    }
  }

  if (selectedBudgetId !== storedBudgetId) {
    await writeUserSettings(userId, { selectedBudgetId: selectedBudgetId ?? undefined });
  }

  return { budgets, selectedBudgetId };
}

export function ynabErrorResponse(error: unknown) {
  if (error instanceof YnabClientError) {
    return json(
      {
        code: error.code,
        message: error.message,
        retryAfterSeconds: error.retryAfterSeconds
      },
      { status: error.status && error.status >= 400 ? error.status : 502 }
    );
  }

  return json({ code: 'fetch-error', message: 'YNAB request failed.' }, { status: 502 });
}

async function fetchDefaultBudgetId(userId: string): Promise<string | null> {
  const response = await ynabFetch<{ data: { budget: YnabBudget } }>(
    userId,
    `/budgets/${DEFAULT_BUDGET_ID}`
  );

  return response.data.budget.id || null;
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;

  return Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}
