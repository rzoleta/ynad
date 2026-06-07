import { normalizeCurrencyFormat } from '$lib/domain/currency';
import type { BudgetEntity } from '$lib/domain/types';
import { DEFAULT_BUDGET_ID, ynabFetch } from '$lib/ynab/client';
import type { YnabBudget } from '$lib/ynab/types';

const BUDGET_KEY = 'ynad.selected-budget';

export type BudgetSelectionState = {
  budgets: BudgetEntity[];
  selectedBudgetId: string | null;
};

export function readSelectedBudgetId(): string | null {
  if (typeof localStorage === 'undefined') return null;

  const budgetId = localStorage.getItem(BUDGET_KEY);
  return budgetId?.trim() ? budgetId : null;
}

export function writeSelectedBudgetId(budgetId: string): void {
  localStorage.setItem(BUDGET_KEY, budgetId);
}

export function clearSelectedBudgetId(): void {
  localStorage.removeItem(BUDGET_KEY);
}

export function getInitialBudgetId(budgets: BudgetEntity[]): string | null {
  const storedBudgetId = readSelectedBudgetId();
  if (!storedBudgetId) return null;

  return budgets.some((budget) => budget.id === storedBudgetId) ? storedBudgetId : null;
}

export async function fetchBudgetOptions(token: string): Promise<BudgetEntity[]> {
  const response = await ynabFetch<{ data: { budgets: YnabBudget[] } }>(token, '/budgets');
  return normalizeBudgetOptions(response.data.budgets);
}

export async function fetchDefaultBudgetId(token: string): Promise<string | null> {
  const response = await ynabFetch<{ data: { budget: YnabBudget } }>(
    token,
    `/budgets/${DEFAULT_BUDGET_ID}`
  );

  return response.data.budget.id || null;
}

export async function fetchBudgetSelectionState(token: string): Promise<BudgetSelectionState> {
  const budgets = await fetchBudgetOptions(token);
  const storedBudgetId = getInitialBudgetId(budgets);

  if (storedBudgetId) {
    return { budgets, selectedBudgetId: storedBudgetId };
  }

  if (budgets.length === 0) {
    clearSelectedBudgetId();
    return { budgets, selectedBudgetId: null };
  }

  const defaultBudgetId = await fetchDefaultBudgetId(token);
  if (defaultBudgetId) writeSelectedBudgetId(defaultBudgetId);

  return { budgets, selectedBudgetId: defaultBudgetId };
}

function normalizeBudgetOptions(budgets: YnabBudget[]): BudgetEntity[] {
  return budgets
    .map((budget) => ({
      id: budget.id,
      name: budget.name,
      currencyFormat: normalizeCurrencyFormat(budget.currency_format)
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
