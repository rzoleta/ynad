import type { ChartConfig } from '$lib/app/chart-config';
import type { WeekStart } from '$lib/app/settings';
import { debugFetch } from '$lib/debug';
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
    debugFetch('chart:no-snapshot', {
      chartId: chart.id,
      chartType: chart.type,
      title: chart.title
    });
    return { status: 'empty', message: 'Connect YNAB to preview this chart.' };
  }

  try {
    if (chart.type === 'balance') return computeBalanceChart(chart, snapshot, weekStart);
    if (chart.type === 'income') return computeIncomeChart(chart, snapshot, weekStart);
    if (chart.type === 'number') return computeNumberChart(chart, snapshot, weekStart);
    return computeSpendingChart(chart, snapshot, weekStart);
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Chart could not be calculated.'
    };
  }
}
