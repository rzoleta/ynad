import type { BudgetEntity } from '$lib/domain/types';
import { ynabProxyFetch } from '$lib/ynab/client';

export type BudgetSelectionState = {
  budgets: BudgetEntity[];
  selectedBudgetId: string | null;
};

export function fetchBudgetSelectionState(): Promise<BudgetSelectionState> {
  return ynabProxyFetch<BudgetSelectionState>('budgets');
}

export function writeSelectedBudgetId(budgetId: string): void {
  void patchUserSettings({ selectedBudgetId: budgetId });
}

export function patchUserSettings(payload: Record<string, unknown>): Promise<Response> {
  return fetch('/api/user-data/settings', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
