import type { Breakdown, ChartConfig, Granularity } from '$lib/app/chart-config';
import type { WeekStart } from '$lib/app/settings';
import { defaultAccountsForChart } from '$lib/domain/accounts';
import {
  getCategoryGroup,
  getCategoryLabel,
  UNCATEGORIZED_CATEGORY_ID
} from '$lib/domain/categories';
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
import { getCategoryTooltipItems, selectBreakdownGroups } from './breakdown';
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
    const dimension = (chart.breakdown ?? 'payee') as Exclude<Breakdown, 'none'>;
    const points = getIncomePieSlices(entries, dimension, snapshot);

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
    if (!matchesCategory(entry, chart)) return false;
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

function getIncomePieSlices(
  entries: TransactionEntry[],
  dimension: Exclude<Breakdown, 'none'>,
  snapshot: NormalizedBudgetData
): PieSlicePoint[] {
  const byGroup = new Map<string, PieSlicePoint>();
  const entriesByGroup = new Map<string, TransactionEntry[]>();

  for (const entry of entries) {
    const { key, label } = getIncomeBreakdownGroup(entry, dimension, snapshot);
    const current = byGroup.get(key);

    if (dimension === 'category-group') {
      const groupEntries = entriesByGroup.get(key) ?? [];
      groupEntries.push(entry);
      entriesByGroup.set(key, groupEntries);
    }

    if (current) {
      current.valueMilliunits += entry.amountMilliunits;
      continue;
    }

    byGroup.set(key, { key, label, valueMilliunits: entry.amountMilliunits });
  }

  const points = [...byGroup.values()].map((point) =>
    dimension === 'category-group'
      ? {
          ...point,
          tooltipItems: getCategoryTooltipItems(
            entriesByGroup.get(point.key) ?? [],
            snapshot.categoryById,
            (entry) => entry.amountMilliunits
          )
        }
      : point
  );

  return aggregatePieSlices(points);
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

function matchesCategory(entry: TransactionEntry, chart: ChartConfig): boolean {
  if (!chart.categories || chart.categories.mode === 'all') return true;

  const categoryId = entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID;
  return chart.categories.ids.includes(categoryId);
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

  const groupContributions = new Map<string, Milliunits>();
  for (const [key, groupEntries] of entriesByGroup) {
    groupContributions.set(
      key,
      buckets.reduce((contribution, bucket) => {
        const bucketTotal = groupEntries
          .filter((entry) => entry.date >= bucket.from && entry.date <= bucket.to)
          .reduce((total, entry) => total + entry.amountMilliunits, 0);
        return contribution + Math.abs(bucketTotal);
      }, 0)
    );
  }

  const { primary: topGroups, overflow: overflowGroups } = selectBreakdownGroups(
    [...groupMap.values()],
    (group) => groupContributions.get(group.key) ?? 0
  );
  const hasOverflow = overflowGroups.length > 0;

  const groups = hasOverflow ? [...topGroups, { key: '__others__', label: 'Others' }] : topGroups;

  const breakdownPoints: BreakdownTimeSeriesPoint[] = buckets.map((bucket) => {
    const values: Record<string, Milliunits> = {};
    const tooltipItems: NonNullable<BreakdownTimeSeriesPoint['tooltipItems']> = {};

    for (const group of topGroups) {
      const groupEntries = entriesByGroup.get(group.key) ?? [];
      const bucketEntries = groupEntries.filter(
        (entry) => entry.date >= bucket.from && entry.date <= bucket.to
      );
      values[group.key] = bucketEntries.reduce((total, entry) => total + entry.amountMilliunits, 0);
      if (dimension === 'category-group') {
        tooltipItems[group.key] = getCategoryTooltipItems(
          bucketEntries,
          snapshot.categoryById,
          (entry) => entry.amountMilliunits
        );
      }
    }

    if (hasOverflow) {
      const bucketEntries = overflowGroups.flatMap((group) =>
        (entriesByGroup.get(group.key) ?? []).filter(
          (entry) => entry.date >= bucket.from && entry.date <= bucket.to
        )
      );
      values['__others__'] = bucketEntries.reduce(
        (total, entry) => total + entry.amountMilliunits,
        0
      );
      if (dimension === 'category-group') {
        tooltipItems['__others__'] = getCategoryTooltipItems(
          bucketEntries,
          snapshot.categoryById,
          (entry) => entry.amountMilliunits
        );
      }
    }

    return {
      bucketId: bucket.id,
      label: bucket.label,
      from: bucket.from,
      to: bucket.to,
      values,
      ...(dimension === 'category-group' ? { tooltipItems } : {})
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

  if (dimension === 'category-group') {
    return getCategoryGroup(entry.categoryId, snapshot.categoryById, snapshot.categoryGroups);
  }

  const key = getPayeeKey(entry.payeeId, entry.payeeName) ?? 'unknown-payee';
  const label = entry.payeeName || 'Unknown Payee';
  return { key, label };
}
