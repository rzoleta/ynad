import type { Breakdown, ChartConfig, Granularity } from '$lib/app/chart-config';
import type { WeekStart } from '$lib/app/settings';
import { defaultAccountsForChart } from '$lib/domain/accounts';
import { getCategoryLabel, UNCATEGORIZED_CATEGORY_ID } from '$lib/domain/categories';
import { makeTimeBuckets, resolveDateRange, isIsoDateInRange } from '$lib/domain/dates';
import { getPayeeKey } from '$lib/domain/payees';
import type { Milliunits, NormalizedBudgetData, TransactionEntry } from '$lib/domain/types';
import { aggregatePieSlices } from './pie';
import type {
  BreakdownGroup,
  BreakdownTimeSeriesPoint,
  ChartBreakdownData,
  ChartResult,
  PieSlicePoint,
  TimeSeriesPoint
} from './types';
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

  const granularity = chart.granularity ?? 'monthly';
  const series = getIncomeTimeSeries(chart, snapshot, weekStart, granularity);

  if (!series.entries.length) return emptyChartResult();

  const result: Extract<ChartResult, { status: 'series' }> = {
    status: 'series',
    visualization: chart.visualization === 'line' ? 'line' : 'bar',
    points: series.points
  };

  if (chart.breakdown && chart.breakdown !== 'none') {
    const breakdown = computeIncomeBreakdown(
      chart.breakdown,
      series.entries,
      chart,
      snapshot,
      weekStart,
      granularity
    );
    if (breakdown) result.breakdown = breakdown;
  }

  return result;
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

  return aggregatePieSlices([...byPayee.values()]);
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

function normalizeLabel(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function isInternalCategoryGroup(groupName: string): boolean {
  return groupName === 'internal master category' || groupName === 'internal master categories';
}

function computeIncomeBreakdown(
  dimension: Exclude<Breakdown, 'none'>,
  entries: TransactionEntry[],
  chart: ChartConfig,
  snapshot: NormalizedBudgetData,
  weekStart: WeekStart,
  granularity: Granularity
): ChartBreakdownData | undefined {
  const range = resolveDateRange(chart.dateRange, snapshot);
  const buckets = makeTimeBuckets(range, granularity, weekStart);

  const groupMap = new Map<string, BreakdownGroup>();
  const entriesByGroup = new Map<string, TransactionEntry[]>();

  for (const entry of entries) {
    const { key, label } = getIncomeBreakdownGroup(entry, dimension, snapshot);
    if (!groupMap.has(key)) {
      groupMap.set(key, { key, label });
      entriesByGroup.set(key, []);
    }
    entriesByGroup.get(key)!.push(entry);
  }

  if (groupMap.size === 0) return undefined;

  const groupTotals = new Map<string, Milliunits>();
  for (const [key, groupEntries] of entriesByGroup) {
    groupTotals.set(
      key,
      groupEntries.reduce((total, entry) => total + entry.amountMilliunits, 0)
    );
  }

  const sortedGroups = [...groupMap.values()].sort(
    (a, b) => (groupTotals.get(b.key) ?? 0) - (groupTotals.get(a.key) ?? 0)
  );

  const MAX_BREAKDOWN_GROUPS = 5;
  const topGroups = sortedGroups.slice(0, MAX_BREAKDOWN_GROUPS);
  const overflowGroups = sortedGroups.slice(MAX_BREAKDOWN_GROUPS);
  const hasOverflow = overflowGroups.length > 0;

  const groups = hasOverflow ? [...topGroups, { key: '__others__', label: 'Others' }] : topGroups;

  const breakdownPoints: BreakdownTimeSeriesPoint[] = buckets.map((bucket) => {
    const values: Record<string, Milliunits> = {};

    for (const group of topGroups) {
      const groupEntries = entriesByGroup.get(group.key) ?? [];
      values[group.key] = groupEntries
        .filter((entry) => entry.date >= bucket.from && entry.date <= bucket.to)
        .reduce((total, entry) => total + entry.amountMilliunits, 0);
    }

    if (hasOverflow) {
      let othersTotal = 0;
      for (const group of overflowGroups) {
        const groupEntries = entriesByGroup.get(group.key) ?? [];
        othersTotal += groupEntries
          .filter((entry) => entry.date >= bucket.from && entry.date <= bucket.to)
          .reduce((total, entry) => total + entry.amountMilliunits, 0);
      }
      values['__others__'] = othersTotal;
    }

    return {
      bucketId: bucket.id,
      label: bucket.label,
      from: bucket.from,
      to: bucket.to,
      values
    };
  });

  return { dimension, groups, breakdownPoints };
}

function getIncomeBreakdownGroup(
  entry: TransactionEntry,
  dimension: Exclude<Breakdown, 'none'>,
  snapshot: NormalizedBudgetData
): { key: string; label: string } {
  if (dimension === 'account') {
    const account = snapshot.accountById.get(entry.accountId);
    return { key: entry.accountId, label: account?.name ?? 'Unknown Account' };
  }

  if (dimension === 'category') {
    const key = entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID;
    const label = getCategoryLabel(entry.categoryId, snapshot.categoryById);
    return { key, label };
  }

  const key = getPayeeKey(entry.payeeId, entry.payeeName) ?? 'unknown-payee';
  const label = entry.payeeName || 'Unknown Payee';
  return { key, label };
}
