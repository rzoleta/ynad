import type { ChartConfig } from '$lib/app/chart-config';
import type { WeekStart } from '$lib/app/settings';
import type { NormalizedBudgetData } from '$lib/domain/types';
import { computeBalanceChart } from './balance';
import { computeIncomeChart } from './income';
import { computeNumberChart } from './number';
import { computeSpendingChart } from './spending';
import type { ChartResult } from './types';

export type { ChartResult } from './types';

export function computeChart(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData | null,
  weekStart: WeekStart
): ChartResult {
  if (!snapshot) {
    return { status: 'empty', message: 'Connect YNAB to preview this chart.' };
  }

  try {
    if (chart.visualization === 'number') return computeNumberChart(chart, snapshot, weekStart);
    if (chart.type === 'balance') return computeBalanceChart(chart, snapshot, weekStart);
    if (chart.type === 'income') return computeIncomeChart(chart, snapshot, weekStart);
    return computeSpendingChart(chart, snapshot, weekStart);
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Chart could not be calculated.'
    };
  }
}
