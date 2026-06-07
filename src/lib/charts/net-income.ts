import type { ChartConfig, Granularity } from '$lib/app/chart-config';
import type { WeekStart } from '$lib/app/settings';
import type { NormalizedBudgetData } from '$lib/domain/types';
import { getIncomeTimeSeries } from './income';
import { getSpendingTimeSeries } from './spending';
import type { TimeSeriesPoint } from './types';

export type NetIncomeSeriesData = {
  matchingEntryCount: number;
  points: TimeSeriesPoint[];
};

export function getNetIncomeTimeSeries(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData,
  weekStart: WeekStart,
  granularity: Granularity
): NetIncomeSeriesData {
  const income = getIncomeTimeSeries(chart, snapshot, weekStart, granularity);
  const spending = getSpendingTimeSeries(chart, snapshot, weekStart, granularity);
  const spendingByBucket = new Map(
    spending.points.map((point) => [point.bucketId, point.valueMilliunits])
  );

  return {
    matchingEntryCount: income.entries.length + spending.entries.length,
    points: income.points.map((point) => ({
      ...point,
      valueMilliunits: point.valueMilliunits - (spendingByBucket.get(point.bucketId) ?? 0)
    }))
  };
}
