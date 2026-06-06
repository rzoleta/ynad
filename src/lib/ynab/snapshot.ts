import { debugFetch } from '$lib/debug';
import { normalizeBudgetData } from '$lib/domain/normalize';
import type { NormalizedBudgetData } from '$lib/domain/types';
import { ynabFetch } from './client';
import type { YnabAccount, YnabBudget, YnabCategoryGroup, YnabTransaction } from './types';

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
  debugFetch('snapshot:raw:start', { budgetId });
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
      `/budgets/${budgetId}/transactions`
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

  debugFetch('snapshot:normalized:success', {
    budgetId,
    budgetName: snapshot.budget.name,
    accounts: snapshot.accounts.length,
    categoryGroups: snapshot.categoryGroups.length,
    transactions: snapshot.transactions.length,
    entries: snapshot.entries.length,
    payees: snapshot.payees.length,
    serverKnowledge: snapshot.serverKnowledge
  });

  return snapshot;
}
