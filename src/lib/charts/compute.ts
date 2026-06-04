import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears
} from 'date-fns';
import type { ChartConfig } from '$lib/app/chart-config';
import type { WeekStart } from '$lib/app/settings';
import { debugFetch } from '$lib/debug';
import type { YnabBudgetSnapshot, YnabTransaction } from '$lib/ynab/types';

export type ChartResult =
  | { status: 'empty'; message: string }
  | { status: 'number'; value: number; label: string }
  | { status: 'series'; points: Array<{ label: string; value: number }>; excluded?: string[] }
  | { status: 'error'; message: string };

export function computeChart(
  chart: ChartConfig,
  snapshot: YnabBudgetSnapshot | null,
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

function computeBalance(chart: ChartConfig, snapshot: YnabBudgetSnapshot, weekStart: WeekStart) {
  const range = resolveDateRange(chart.dateRange);
  if (chart.visualization === 'pie') {
    const accounts = filterAccounts(snapshot, chart);
    const points = accounts
      .map((account) => ({ label: account.name, value: account.balance }))
      .filter((point) => point.value !== 0);
    return points.length ? { status: 'series' as const, points } : empty();
  }

  const buckets = makeBuckets(range, chart.granularity ?? 'monthly', weekStart);
  const accounts = new Set(filterAccounts(snapshot, chart).map((account) => account.id));
  const transactions = snapshot.transactions.filter((transaction) =>
    accounts.has(transaction.account_id)
  );
  const points = buckets.map((bucket) => {
    const value = transactions
      .filter((transaction) => transaction.date <= bucket.to)
      .reduce((total, transaction) => total + transaction.amount, 0);
    return { label: bucket.label, value };
  });

  return points.length ? { status: 'series' as const, points } : empty();
}

function computeSpending(chart: ChartConfig, snapshot: YnabBudgetSnapshot, weekStart: WeekStart) {
  const range = resolveDateRange(chart.dateRange);
  const entries = getTransactionEntries(snapshot.transactions).filter((entry) => {
    if (entry.date < range.from || entry.date > range.to) return false;
    if (entry.transferAccountId) return false;
    if (entry.amount < 0) return matchesSpendingFilters(entry, chart);
    if (entry.amount > 0 && entry.categoryId) return matchesSpendingFilters(entry, chart);
    return false;
  });

  if (chart.visualization === 'pie') {
    const byCategory = new Map<string, number>();
    for (const entry of entries) {
      const label = entry.categoryId ?? 'Uncategorized';
      byCategory.set(label, (byCategory.get(label) ?? 0) - entry.amount);
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

function computeIncome(chart: ChartConfig, snapshot: YnabBudgetSnapshot, weekStart: WeekStart) {
  const range = resolveDateRange(chart.dateRange);
  const entries = getTransactionEntries(snapshot.transactions).filter((entry) => {
    if (entry.date < range.from || entry.date > range.to) return false;
    if (entry.amount <= 0 || entry.transferAccountId) return false;
    return matchesAccountAndPayee(entry, chart);
  });

  if (chart.visualization === 'pie') {
    const byPayee = new Map<string, number>();
    for (const entry of entries) {
      const label = entry.payeeName || 'Income';
      byPayee.set(label, (byPayee.get(label) ?? 0) + entry.amount);
    }
    const points = [...byPayee.entries()].map(([label, value]) => ({ label, value }));
    return points.length ? { status: 'series' as const, points } : empty();
  }

  return seriesFromEntries(entries, chart, weekStart, (amount) => amount);
}

function computeNumber(chart: ChartConfig, snapshot: YnabBudgetSnapshot, weekStart: WeekStart) {
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

  return { status: 'number' as const, value: value ?? 0, label: operation };
}

function computeNetIncome(chart: ChartConfig, snapshot: YnabBudgetSnapshot, weekStart: WeekStart) {
  const income = computeIncome(chart, snapshot, weekStart);
  const spending = computeSpending(chart, snapshot, weekStart);
  if (income.status !== 'series' || spending.status !== 'series') return empty();

  const map = new Map<string, number>();
  for (const point of income.points) map.set(point.label, point.value);
  for (const point of spending.points)
    map.set(point.label, (map.get(point.label) ?? 0) - point.value);
  return {
    status: 'series' as const,
    points: [...map.entries()].map(([label, value]) => ({ label, value }))
  };
}

function seriesFromEntries(
  entries: ReturnType<typeof getTransactionEntries>,
  chart: ChartConfig,
  weekStart: WeekStart,
  mapAmount: (amount: number) => number
) {
  const range = resolveDateRange(chart.dateRange);
  const buckets = makeBuckets(range, chart.granularity ?? 'monthly', weekStart);
  const points = buckets.map((bucket) => ({
    label: bucket.label,
    value: entries
      .filter((entry) => entry.date >= bucket.from && entry.date <= bucket.to)
      .reduce((total, entry) => total + mapAmount(entry.amount), 0)
  }));

  return points.some((point) => point.value !== 0)
    ? { status: 'series' as const, points }
    : empty();
}

function empty() {
  return { status: 'empty' as const, message: 'No matching data.' };
}

function filterAccounts(snapshot: YnabBudgetSnapshot, chart: ChartConfig) {
  if (chart.accounts.mode === 'selected') {
    const ids = new Set(chart.accounts.ids);
    return snapshot.accounts.filter((account) => ids.has(account.id));
  }

  if (chart.type === 'spending') return snapshot.accounts.filter((account) => account.on_budget);
  return snapshot.accounts;
}

function matchesSpendingFilters(
  entry: ReturnType<typeof getTransactionEntries>[number],
  chart: ChartConfig
) {
  if (!matchesAccountAndPayee(entry, chart)) return false;
  if (!chart.categories || chart.categories.mode === 'all') return true;
  return chart.categories.ids.includes(entry.categoryId ?? 'uncategorized');
}

function matchesAccountAndPayee(
  entry: ReturnType<typeof getTransactionEntries>[number],
  chart: ChartConfig
) {
  if (chart.accounts.mode === 'selected' && !chart.accounts.ids.includes(entry.accountId))
    return false;
  if (!chart.payees || chart.payees.mode === 'all') return true;
  return chart.payees.payees.some((payee) =>
    payee.id ? payee.id === entry.payeeId : payee.name === entry.payeeName
  );
}

function getTransactionEntries(transactions: YnabTransaction[]) {
  return transactions.flatMap((transaction) => {
    if (transaction.subtransactions?.length) {
      return transaction.subtransactions
        .filter((subtransaction) => !subtransaction.deleted)
        .map((subtransaction) => ({
          date: transaction.date,
          accountId: transaction.account_id,
          amount: subtransaction.amount,
          categoryId: subtransaction.category_id ?? transaction.category_id,
          payeeId: subtransaction.payee_id ?? transaction.payee_id,
          payeeName: subtransaction.payee_name ?? transaction.payee_name,
          transferAccountId: transaction.transfer_account_id
        }));
    }

    return [
      {
        date: transaction.date,
        accountId: transaction.account_id,
        amount: transaction.amount,
        categoryId: transaction.category_id,
        payeeId: transaction.payee_id,
        payeeName: transaction.payee_name,
        transferAccountId: transaction.transfer_account_id
      }
    ];
  });
}

function resolveDateRange(range: ChartConfig['dateRange']) {
  const now = new Date();
  if (range.preset === 'custom') return { from: range.from, to: range.to };
  if (range.preset === 'this-year') return isoRange(startOfYear(now), endOfYear(now));
  if (range.preset === 'last-month') {
    const date = subMonths(now, 1);
    return isoRange(startOfMonth(date), endOfMonth(date));
  }
  if (range.preset === 'last-year') {
    const date = subYears(now, 1);
    return isoRange(startOfYear(date), endOfYear(date));
  }
  if (range.preset === 'last-12-months') return isoRange(startOfMonth(subMonths(now, 11)), now);
  return isoRange(startOfMonth(now), endOfMonth(now));
}

function isoRange(from: Date, to: Date) {
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function makeBuckets(
  range: { from: string; to: string },
  granularity: NonNullable<ChartConfig['granularity']>,
  weekStart: WeekStart
) {
  void weekStart;
  const buckets: Array<{ label: string; from: string; to: string }> = [];
  let cursor = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T00:00:00`);

  while (cursor <= end) {
    const from = new Date(cursor);
    const next =
      granularity === 'daily'
        ? addDays(cursor, 1)
        : granularity === 'weekly'
          ? addWeeks(cursor, 1)
          : granularity === 'yearly'
            ? addYears(cursor, 1)
            : addMonths(cursor, 1);
    const to = new Date(Math.min(addDays(next, -1).getTime(), end.getTime()));
    buckets.push({
      label: from.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10)
    });
    cursor = next;
  }

  return buckets;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted[middle];
  if (value === undefined) return 0;
  if (sorted.length % 2) return value;
  return Math.round(((sorted[middle - 1] ?? 0) + value) / 2);
}
