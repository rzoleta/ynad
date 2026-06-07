import type { ChartConfig, Granularity } from '$lib/app/chart-config';
import type { WeekStart } from '$lib/app/settings';
import { defaultAccountsForChart } from '$lib/domain/accounts';
import { makeTimeBuckets, resolveDateRange, isIsoDateInRange } from '$lib/domain/dates';
import { getPayeeKey } from '$lib/domain/payees';
import type { NormalizedBudgetData, TransactionEntry } from '$lib/domain/types';
import type { ChartResult, PieSlicePoint, TimeSeriesPoint } from './types';
import { emptyChartResult } from './types';

export type IncomeSeriesData = {
  entries: TransactionEntry[];
  points: TimeSeriesPoint[];
};

export function computeIncomeChart(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData,
  weekStart: WeekStart
): ChartResult {
  const entries = getIncomeEntries(chart, snapshot);

  if (chart.visualization === 'pie') {
    const points = getIncomePieSlices(entries);

    return points.length ? { status: 'series', visualization: 'pie', points } : emptyChartResult();
  }

  const series = getIncomeTimeSeries(chart, snapshot, weekStart, chart.granularity ?? 'monthly');

  return series.entries.length
    ? {
        status: 'series',
        visualization: chart.visualization === 'line' ? 'line' : 'bar',
        points: series.points
      }
    : emptyChartResult();
}

export function getIncomeTimeSeries(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData,
  weekStart: WeekStart,
  granularity: Granularity
): IncomeSeriesData {
  const entries = getIncomeEntries(chart, snapshot);
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
        .reduce((total, entry) => total + entry.amountMilliunits, 0)
    }))
  };
}

export function getIncomeEntries(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData
): TransactionEntry[] {
  const range = resolveDateRange(chart.dateRange, snapshot);

  return snapshot.entries.filter((entry) => {
    if (!isIsoDateInRange(entry.date, range)) return false;
    if (!isIncomeEntry(entry, snapshot)) return false;
    if (!matchesAccount(entry, chart, snapshot)) return false;
    return matchesPayee(entry, chart);
  });
}

export function isIncomeEntry(entry: TransactionEntry, snapshot: NormalizedBudgetData): boolean {
  if (entry.isTransfer || entry.amountMilliunits <= 0) return false;
  return !entry.categoryId || isYnabInflowCategory(entry.categoryId, snapshot);
}

export function isYnabInflowCategory(
  categoryId: string | null,
  snapshot: NormalizedBudgetData
): boolean {
  if (!categoryId) return false;
  if (categoryId.toLowerCase() === 'inflow') return true;

  const category = snapshot.categoryById.get(categoryId);
  const categoryName = normalizeLabel(category?.name);
  const groupName = normalizeLabel(
    snapshot.categoryGroups.find((group) => group.id === category?.groupId)?.name
  );

  if (categoryName === 'inflow: ready to assign') return true;

  return (
    isInternalCategoryGroup(groupName) &&
    (categoryName.includes('inflow') || categoryName.includes('ready to assign'))
  );
}

function getIncomePieSlices(entries: TransactionEntry[]): PieSlicePoint[] {
  const byPayee = new Map<string, PieSlicePoint>();

  for (const entry of entries) {
    const key = getPayeeKey(entry.payeeId, entry.payeeName) ?? 'income';
    const label = entry.payeeName || 'Income';
    const current = byPayee.get(key);

    if (current) {
      current.valueMilliunits += entry.amountMilliunits;
      continue;
    }

    byPayee.set(key, { key, label, valueMilliunits: entry.amountMilliunits });
  }

  return [...byPayee.values()].sort(sortPieSlices);
}

function matchesAccount(
  entry: TransactionEntry,
  chart: ChartConfig,
  snapshot: NormalizedBudgetData
): boolean {
  if (chart.accounts.mode === 'selected') return chart.accounts.ids.includes(entry.accountId);

  const defaultAccountIds = new Set(
    defaultAccountsForChart('income', snapshot.accounts).map((account) => account.id)
  );
  return defaultAccountIds.has(entry.accountId);
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

function normalizeLabel(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function isInternalCategoryGroup(groupName: string): boolean {
  return groupName === 'internal master category' || groupName === 'internal master categories';
}
