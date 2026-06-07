import type {
  ChartConfig,
  Granularity,
  NumberMetric,
  NumberOperation
} from '$lib/app/chart-config';
import type { WeekStart } from '$lib/app/settings';
import { resolveDateRange } from '$lib/domain/dates';
import type { Milliunits, NormalizedBudgetData } from '$lib/domain/types';
import { getBalanceTimeSeries, getCombinedBalanceAtDate } from './balance';
import { getIncomeTimeSeries } from './income';
import { getNetIncomeTimeSeries } from './net-income';
import { getSpendingTimeSeries } from './spending';
import type { ChartNumberResult, ChartResult, TimeSeriesPoint } from './types';
import { emptyChartResult } from './types';

export function computeNumberChart(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData,
  weekStart: WeekStart
): ChartResult {
  const metric = chart.numberMetric ?? 'spending';
  const operation = normalizeOperation(metric, chart.numberOperation);
  const granularity = chart.numberPeriod ?? 'monthly';

  if (metric === 'balance') {
    return computeBalanceNumber(chart, snapshot, weekStart, operation, granularity);
  }

  const data =
    metric === 'income'
      ? getIncomeTimeSeries(chart, snapshot, weekStart, granularity)
      : metric === 'net-income'
        ? getNetIncomeTimeSeries(chart, snapshot, weekStart, granularity)
        : getSpendingTimeSeries(chart, snapshot, weekStart, granularity);

  const matchingEntryCount =
    'matchingEntryCount' in data ? data.matchingEntryCount : data.entries.length;
  if (matchingEntryCount === 0 || data.points.length === 0) return emptyChartResult();

  return numberResult(metric, operation, valueForOperation(data.points, operation));
}

function computeBalanceNumber(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData,
  weekStart: WeekStart,
  operation: NumberOperation,
  granularity: Granularity
): ChartNumberResult | ReturnType<typeof emptyChartResult> {
  if (operation === 'current') {
    const range = resolveDateRange(chart.dateRange);
    const balance = getCombinedBalanceAtDate(chart, snapshot, range.to);

    return balance.accounts.length
      ? numberResult('balance', operation, balance.valueMilliunits)
      : emptyChartResult();
  }

  const series = getBalanceTimeSeries(chart, snapshot, weekStart, granularity);

  if (series.accounts.length === 0 || series.points.length === 0) return emptyChartResult();

  return numberResult('balance', operation, valueForOperation(series.points, operation));
}

function valueForOperation(points: TimeSeriesPoint[], operation: NumberOperation): Milliunits {
  const values = points.map((point) => point.valueMilliunits);

  if (operation === 'average') {
    return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
  }

  if (operation === 'median') return median(values);

  if (operation === 'current') return values.at(-1) ?? 0;

  return values.reduce((total, value) => total + value, 0);
}

function numberResult(
  metric: NumberMetric,
  operation: NumberOperation,
  valueMilliunits: Milliunits
): ChartNumberResult {
  return {
    status: 'number',
    valueMilliunits,
    label: `${operationLabel(operation)} ${metricLabel(metric)}`
  };
}

function normalizeOperation(
  metric: NumberMetric,
  operation: NumberOperation | undefined
): NumberOperation {
  if (metric === 'balance') {
    return operation === 'average' || operation === 'median' ? operation : 'current';
  }

  return operation === 'average' || operation === 'median' ? operation : 'total';
}

function median(values: Milliunits[]): Milliunits {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted[middle];

  if (value === undefined) return 0;
  if (sorted.length % 2) return value;

  return Math.round(((sorted[middle - 1] ?? 0) + value) / 2);
}

function operationLabel(operation: NumberOperation): string {
  if (operation === 'current') return 'Current';
  if (operation === 'total') return 'Total';
  if (operation === 'average') return 'Average';
  return 'Median';
}

function metricLabel(metric: NumberMetric): string {
  if (metric === 'net-income') return 'Net Income';
  return `${metric.slice(0, 1).toUpperCase()}${metric.slice(1)}`;
}
