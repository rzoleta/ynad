import { normalizeBudgetData } from '$lib/domain/normalize';
import type { NormalizedBudgetData } from '$lib/domain/types';
import { ynabProxyFetch } from './client';
import type { YnabBudgetSnapshot } from './types';

export async function fetchNormalizedBudgetSnapshot(
  budgetId: string
): Promise<NormalizedBudgetData> {
  const rawSnapshot = await ynabProxyFetch<YnabBudgetSnapshot>('snapshot', { budgetId });
  return normalizeBudgetData(rawSnapshot);
}
