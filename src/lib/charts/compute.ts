import type { ChartConfig } from '$lib/app/chart-config';
import type { WeekStart } from '$lib/app/settings';
import { debugFetch } from '$lib/debug';
import { defaultAccountsForChart } from '$lib/domain/accounts';
import { getCategoryLabel, UNCATEGORIZED_CATEGORY_ID } from '$lib/domain/categories';
import { isIsoDateInRange, makeTimeBuckets, resolveDateRange } from '$lib/domain/dates';
import type {
  AccountEntity,
  CurrencyFormat,
  NormalizedBudgetData,
  TransactionEntry
} from '$lib/domain/types';

export type ChartResult =
  | { status: 'empty'; message: string }
  | { status: 'number'; value: number; label: string; currency: CurrencyFormat }
  | { status: 'series'; points: Array<{ label: string; value: number }>; excluded?: string[] }
  | { status: 'error'; message: string };

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
    if (chart.type === 'balance') return computeBalance(chart, snapshot, weekStart);
    if (chart.type === 'income') return computeIncome(chart, snapshot, weekStart);
    if (chart.type === 'number') return computeNumber(chart, snapshot, weekStart);
    return computeSpending(chart, snapshot, weekStart);
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Chart could not be calculated.'
    };
  }
}

function computeBalance(chart: ChartConfig, snapshot: NormalizedBudgetData, weekStart: WeekStart) {
  const range = resolveDateRange(chart.dateRange);
  const accounts = filterAccounts(snapshot, chart);

  if (chart.visualization === 'pie') {
    const points = accounts
      .map((account) => ({ label: account.name, value: account.balanceMilliunits }))
      .filter((point) => point.value !== 0);
    return points.length ? { status: 'series' as const, points } : empty();
  }

  const buckets = makeTimeBuckets(range, chart.granularity ?? 'monthly', weekStart);
  const accountIds = new Set(accounts.map((account) => account.id));
  const transactions = snapshot.transactions.filter((transaction) =>
    accountIds.has(transaction.accountId)
  );
  const points = buckets.map((bucket) => {
    const value = transactions
      .filter((transaction) => transaction.date <= bucket.to)
      .reduce((total, transaction) => total + transaction.amountMilliunits, 0);
    return { label: bucket.label, value };
  });

  return points.length ? { status: 'series' as const, points } : empty();
}

function computeSpending(chart: ChartConfig, snapshot: NormalizedBudgetData, weekStart: WeekStart) {
  const range = resolveDateRange(chart.dateRange);
  const entries = snapshot.entries.filter((entry) => {
    if (!isIsoDateInRange(entry.date, range)) return false;
    if (entry.isTransfer) return false;
    if (entry.amountMilliunits < 0) return matchesSpendingFilters(entry, chart, snapshot);
    if (entry.amountMilliunits > 0 && entry.categoryId) {
      return matchesSpendingFilters(entry, chart, snapshot);
    }
    return false;
  });

  if (chart.visualization === 'pie') {
    const byCategory = new Map<string, number>();
    for (const entry of entries) {
      const label = getCategoryLabel(entry.categoryId, snapshot.categoryById);
      byCategory.set(label, (byCategory.get(label) ?? 0) - entry.amountMilliunits);
    }
    const excluded: string[] = [];
    const points = [...byCategory.entries()]
      .map(([label, value]) => ({ label, value }))
      .filter((point) => {
        if (point.value <= 0) excluded.push(point.label);
        return point.value > 0;
      });
    return points.length ? { status: 'series' as const, points, excluded } : empty();
  }

  return seriesFromEntries(entries, chart, weekStart, (amount) => -amount);
}

function computeIncome(chart: ChartConfig, snapshot: NormalizedBudgetData, weekStart: WeekStart) {
  const range = resolveDateRange(chart.dateRange);
  const entries = snapshot.entries.filter((entry) => {
    if (!isIsoDateInRange(entry.date, range)) return false;
    if (entry.amountMilliunits <= 0 || entry.isTransfer) return false;
    return matchesAccountAndPayee(entry, chart, snapshot);
  });

  if (chart.visualization === 'pie') {
    const byPayee = new Map<string, number>();
    for (const entry of entries) {
      const label = entry.payeeName || 'Income';
      byPayee.set(label, (byPayee.get(label) ?? 0) + entry.amountMilliunits);
    }
    const points = [...byPayee.entries()].map(([label, value]) => ({ label, value }));
    return points.length ? { status: 'series' as const, points } : empty();
  }

  return seriesFromEntries(entries, chart, weekStart, (amount) => amount);
}

function computeNumber(chart: ChartConfig, snapshot: NormalizedBudgetData, weekStart: WeekStart) {
  const metric = chart.numberMetric ?? 'spending';
  const operation = chart.numberOperation ?? 'total';
  const visualChart: ChartConfig = {
    ...chart,
    type: metric === 'net-income' ? 'spending' : metric,
    visualization: 'bar',
    granularity: chart.numberPeriod ?? 'monthly'
  };

  const result =
    metric === 'balance'
      ? computeBalance(visualChart, snapshot, weekStart)
      : metric === 'income'
        ? computeIncome(visualChart, snapshot, weekStart)
        : metric === 'net-income'
          ? computeNetIncome(visualChart, snapshot, weekStart)
          : computeSpending(visualChart, snapshot, weekStart);

  if (result.status !== 'series' || !result.points.length) return empty();
  const values = result.points.map((point) => point.value);
  const value =
    operation === 'current'
      ? values.at(-1)
      : operation === 'average'
        ? Math.round(values.reduce((total, item) => total + item, 0) / values.length)
        : operation === 'median'
          ? median(values)
          : values.reduce((total, item) => total + item, 0);

  return {
    status: 'number' as const,
    value: value ?? 0,
    label: operation,
    currency: snapshot.budget.currencyFormat
  };
}

function computeNetIncome(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData,
  weekStart: WeekStart
) {
  const income = computeIncome(chart, snapshot, weekStart);
  const spending = computeSpending(chart, snapshot, weekStart);
  if (income.status !== 'series' || spending.status !== 'series') return empty();

  const map = new Map<string, number>();
  for (const point of income.points) map.set(point.label, point.value);
  for (const point of spending.points) {
    map.set(point.label, (map.get(point.label) ?? 0) - point.value);
  }

  return {
    status: 'series' as const,
    points: [...map.entries()].map(([label, value]) => ({ label, value }))
  };
}

function seriesFromEntries(
  entries: TransactionEntry[],
  chart: ChartConfig,
  weekStart: WeekStart,
  mapAmount: (amount: number) => number
) {
  const range = resolveDateRange(chart.dateRange);
  const buckets = makeTimeBuckets(range, chart.granularity ?? 'monthly', weekStart);
  const points = buckets.map((bucket) => ({
    label: bucket.label,
    value: entries
      .filter((entry) => entry.date >= bucket.from && entry.date <= bucket.to)
      .reduce((total, entry) => total + mapAmount(entry.amountMilliunits), 0)
  }));

  return points.some((point) => point.value !== 0)
    ? { status: 'series' as const, points }
    : empty();
}

function empty() {
  return { status: 'empty' as const, message: 'No matching data.' };
}

function filterAccounts(snapshot: NormalizedBudgetData, chart: ChartConfig): AccountEntity[] {
  if (chart.accounts.mode === 'selected') {
    const ids = new Set(chart.accounts.ids);
    return snapshot.accounts.filter((account) => ids.has(account.id));
  }

  return defaultAccountsForChart(chart.type, snapshot.accounts);
}

function matchesSpendingFilters(
  entry: TransactionEntry,
  chart: ChartConfig,
  snapshot: NormalizedBudgetData
) {
  if (!matchesAccountAndPayee(entry, chart, snapshot)) return false;
  if (!chart.categories || chart.categories.mode === 'all') return true;
  return chart.categories.ids.includes(entry.categoryId ?? UNCATEGORIZED_CATEGORY_ID);
}

function matchesAccountAndPayee(
  entry: TransactionEntry,
  chart: ChartConfig,
  snapshot: NormalizedBudgetData
) {
  if (!matchesAccount(entry, chart, snapshot)) return false;
  if (!chart.payees || chart.payees.mode === 'all') return true;
  return chart.payees.payees.some((payee) =>
    payee.id ? payee.id === entry.payeeId : payee.name === entry.payeeName
  );
}

function matchesAccount(
  entry: TransactionEntry,
  chart: ChartConfig,
  snapshot: NormalizedBudgetData
) {
  if (chart.accounts.mode === 'selected') return chart.accounts.ids.includes(entry.accountId);

  const defaultAccountIds = new Set(
    defaultAccountsForChart(chart.type, snapshot.accounts).map((account) => account.id)
  );
  return defaultAccountIds.has(entry.accountId);
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted[middle];
  if (value === undefined) return 0;
  if (sorted.length % 2) return value;
  return Math.round(((sorted[middle - 1] ?? 0) + value) / 2);
}
