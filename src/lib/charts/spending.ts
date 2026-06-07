import type { ChartConfig, Granularity } from '$lib/app/chart-config';
import type { WeekStart } from '$lib/app/settings';
import { defaultAccountsForChart } from '$lib/domain/accounts';
import { getCategoryLabel, UNCATEGORIZED_CATEGORY_ID } from '$lib/domain/categories';
import { makeTimeBuckets, resolveDateRange, isIsoDateInRange } from '$lib/domain/dates';
import type { NormalizedBudgetData, TransactionEntry } from '$lib/domain/types';
import { isYnabInflowCategory } from './income';
import type { ChartResult, PieSlicePoint, TimeSeriesPoint } from './types';
import { emptyChartResult } from './types';

export type SpendingSeriesData = {
  entries: TransactionEntry[];
  points: TimeSeriesPoint[];
};

export function computeSpendingChart(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData,
  weekStart: WeekStart
): ChartResult {
  const entries = getSpendingEntries(chart, snapshot);

  if (chart.visualization === 'pie') {
    const { points, excluded } = getSpendingPieSlices(entries, snapshot);

    return points.length
      ? { status: 'series', visualization: 'pie', points, excluded }
      : emptyChartResult();
  }

  const series = getSpendingTimeSeries(chart, snapshot, weekStart, chart.granularity ?? 'monthly');

  return series.entries.length
    ? {
        status: 'series',
        visualization: chart.visualization === 'line' ? 'line' : 'bar',
        points: series.points
      }
    : emptyChartResult();
}

export function getSpendingTimeSeries(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData,
  weekStart: WeekStart,
  granularity: Granularity
): SpendingSeriesData {
  const entries = getSpendingEntries(chart, snapshot);
  const range = resolveDateRange(chart.dateRange, snapshot);
  const buckets = makeTimeBuckets(range, granularity, weekStart);

  return {
    entries,
    points: buckets.map((bucket) => ({
      bucketId: bucket.id,
      label: bucket.label,
      from: bucket.from,
      to: bucket.to,
      valueMilliunits: entries
        .filter((entry) => entry.date >= bucket.from && entry.date <= bucket.to)
        .reduce((total, entry) => total - entry.amountMilliunits, 0)
    }))
  };
}

export function getSpendingEntries(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData
): TransactionEntry[] {
  const range = resolveDateRange(chart.dateRange, snapshot);

  return snapshot.entries.filter((entry) => {
    if (!isIsoDateInRange(entry.date, range)) return false;
    if (!isSpendingEntry(entry, snapshot)) return false;
    if (!matchesAccount(entry, chart, snapshot)) return false;
    if (!matchesCategory(entry, chart)) return false;
    return matchesPayee(entry, chart);
  });
}

export function isSpendingEntry(entry: TransactionEntry, snapshot: NormalizedBudgetData): boolean {
  if (entry.isTransfer || entry.amountMilliunits === 0) return false;

  if (entry.amountMilliunits < 0) {
    return !isYnabInflowCategory(entry.categoryId, snapshot);
  }

  return Boolean(entry.categoryId && !isYnabInflowCategory(entry.categoryId, snapshot));
}

function getSpendingPieSlices(
  entries: TransactionEntry[],
  snapshot: NormalizedBudgetData
): {
  points: PieSlicePoint[];
  excluded: NonNullable<Extract<ChartResult, { status: 'series' }>['excluded']>;
} {
  const byCategory = new Map<string, PieSlicePoint>();

  for (const entry of entries) {
    const key = entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID;
    const label = getCategoryLabel(entry.categoryId, snapshot.categoryById);
    const current = byCategory.get(key);
    const valueMilliunits = -entry.amountMilliunits;

    if (current) {
      current.valueMilliunits += valueMilliunits;
      continue;
    }

    byCategory.set(key, { key, label, valueMilliunits });
  }

  const excluded: NonNullable<Extract<ChartResult, { status: 'series' }>['excluded']> = [];
  const points = [...byCategory.values()].sort(sortPieSlices).filter((point) => {
    if (point.valueMilliunits > 0) return true;

    excluded.push({
      key: point.key,
      label: point.label,
      valueMilliunits: point.valueMilliunits,
      reason: 'non-positive-pie-slice'
    });
    return false;
  });

  return { points, excluded };
}

function matchesAccount(
  entry: TransactionEntry,
  chart: ChartConfig,
  snapshot: NormalizedBudgetData
): boolean {
  if (chart.accounts.mode === 'selected') return chart.accounts.ids.includes(entry.accountId);

  const defaultAccountIds = new Set(
    defaultAccountsForChart('spending', snapshot.accounts).map((account) => account.id)
  );
  return defaultAccountIds.has(entry.accountId);
}

function matchesCategory(entry: TransactionEntry, chart: ChartConfig): boolean {
  if (!chart.categories || chart.categories.mode === 'all') return true;

  const categoryId = entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID;
  return chart.categories.ids.includes(categoryId);
}

function matchesPayee(entry: TransactionEntry, chart: ChartConfig): boolean {
  if (!chart.payees || chart.payees.mode === 'all') return true;

  return chart.payees.payees.some((payee) =>
    payee.id ? payee.id === entry.payeeId : payee.name === entry.payeeName
  );
}

function sortPieSlices(left: PieSlicePoint, right: PieSlicePoint): number {
  return right.valueMilliunits - left.valueMilliunits || left.label.localeCompare(right.label);
}
