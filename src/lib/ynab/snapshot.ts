import { normalizeBudgetData } from '$lib/domain/normalize';
import type { NormalizedBudgetData } from '$lib/domain/types';
import { ynabFetch } from './client';
import type { YnabAccount, YnabBudget, YnabCategoryGroup, YnabTransaction } from './types';

const ALL_TRANSACTIONS_SINCE_DATE = '1900-01-01';

export type YnabRawSnapshot = {
  budget: YnabBudget;
  budgets: YnabBudget[];
  accounts: YnabAccount[];
  categoryGroups: YnabCategoryGroup[];
  transactions: YnabTransaction[];
  serverKnowledge: number | null;
};

export async function fetchRawBudgetSnapshot(
  token: string,
  budgetId: string
): Promise<YnabRawSnapshot> {
  const [
    budgetsResponse,
    budgetResponse,
    accountsResponse,
    categoriesResponse,
    transactionsResponse
  ] = await Promise.all([
    ynabFetch<{ data: { budgets: YnabBudget[] } }>(token, '/budgets'),
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

export async function fetchNormalizedBudgetSnapshot(
  token: string,
  budgetId: string
): Promise<NormalizedBudgetData> {
  const rawSnapshot = await fetchRawBudgetSnapshot(token, budgetId);
  const snapshot = normalizeBudgetData(rawSnapshot);

  return snapshot;
}
