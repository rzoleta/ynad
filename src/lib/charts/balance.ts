import type { ChartConfig, Granularity } from '$lib/app/chart-config';
import type { WeekStart } from '$lib/app/settings';
import { defaultAccountsForChart } from '$lib/domain/accounts';
import { makeTimeBuckets, resolveDateRange, formatLocalISODate } from '$lib/domain/dates';
import type {
  AccountEntity,
  ISODate,
  Milliunits,
  NormalizedBudgetData,
  TransactionEntity
} from '$lib/domain/types';
import type {
  BreakdownGroup,
  BreakdownTimeSeriesPoint,
  ChartBreakdownData,
  ChartResult,
  PieSlicePoint,
  TimeSeriesPoint
} from './types';
import { selectBreakdownGroups } from './breakdown';
import { aggregatePieSlices } from './pie';
import { emptyChartResult } from './types';

export type BalanceSeriesData = {
  accounts: AccountEntity[];
  points: TimeSeriesPoint[];
};

export function computeBalanceChart(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData,
  weekStart: WeekStart
): ChartResult {
  const accounts = getBalanceAccounts(chart, snapshot);

  if (accounts.length === 0) return emptyChartResult();

  if (chart.visualization === 'pie') {
    const transactionLookup = transactionsByAccount(snapshot.transactions);
    const today = formatLocalISODate(new Date());
    const points = aggregatePieSlices(
      accounts
        .map(
          (account): PieSlicePoint => ({
            key: account.id,
            label: account.name,
            valueMilliunits: getAccountBalanceAtDate(account, transactionLookup, today)
          })
        )
        .filter((point) => point.valueMilliunits !== 0)
    );

    return points.length ? { status: 'series', visualization: 'pie', points } : emptyChartResult();
  }

  const granularity = chart.granularity ?? 'monthly';
  const series = getBalanceTimeSeries(chart, snapshot, weekStart, granularity);

  if (!series.points.length) return emptyChartResult();

  const result: Extract<ChartResult, { status: 'series' }> = {
    status: 'series',
    visualization: chart.visualization === 'bar' ? 'bar' : 'line',
    points: series.points
  };

  if (chart.breakdown === 'account') {
    const breakdown = computeBalanceBreakdown(
      series.accounts,
      snapshot,
      chart,
      weekStart,
      granularity
    );
    if (breakdown) result.breakdown = breakdown;
  }

  return result;
}

export function getBalanceTimeSeries(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData,
  weekStart: WeekStart,
  granularity: Granularity
): BalanceSeriesData {
  const range = resolveDateRange(chart.dateRange, snapshot);
  const buckets = makeTimeBuckets(range, granularity, weekStart);
  const accounts = getBalanceAccounts(chart, snapshot);
  const transactionLookup = transactionsByAccount(snapshot.transactions);

  return {
    accounts,
    points: buckets.map((bucket) => ({
      bucketId: bucket.id,
      label: bucket.label,
      from: bucket.from,
      to: bucket.to,
      valueMilliunits: accounts.reduce(
        (total, account) => total + getAccountBalanceAtDate(account, transactionLookup, bucket.to),
        0
      )
    }))
  };
}

export function getCombinedBalanceAtDate(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData,
  date: ISODate
): { accounts: AccountEntity[]; valueMilliunits: Milliunits } {
  const accounts = getBalanceAccounts(chart, snapshot);
  const transactionLookup = transactionsByAccount(snapshot.transactions);

  return {
    accounts,
    valueMilliunits: accounts.reduce(
      (total, account) => total + getAccountBalanceAtDate(account, transactionLookup, date),
      0
    )
  };
}

export function getBalanceAccounts(
  chart: ChartConfig,
  snapshot: NormalizedBudgetData
): AccountEntity[] {
  if (chart.accounts.mode === 'selected') {
    const selectedIds = new Set(chart.accounts.ids);
    return snapshot.accounts.filter((account) => selectedIds.has(account.id));
  }

  return defaultAccountsForChart('balance', snapshot.accounts);
}

function getAccountBalanceAtDate(
  account: AccountEntity,
  transactionLookup: Map<string, TransactionEntity[]>,
  date: ISODate
): Milliunits {
  const laterTransactionTotal = (transactionLookup.get(account.id) ?? [])
    .filter((transaction) => transaction.date > date)
    .reduce((total, transaction) => total + transaction.amountMilliunits, 0);

  return account.balanceMilliunits - laterTransactionTotal;
}

function transactionsByAccount(
  transactions: TransactionEntity[]
): Map<string, TransactionEntity[]> {
  const lookup = new Map<string, TransactionEntity[]>();

  for (const transaction of transactions) {
    const accountTransactions = lookup.get(transaction.accountId) ?? [];
    accountTransactions.push(transaction);
    lookup.set(transaction.accountId, accountTransactions);
  }

  return lookup;
}

function computeBalanceBreakdown(
  accounts: AccountEntity[],
  snapshot: NormalizedBudgetData,
  chart: ChartConfig,
  weekStart: WeekStart,
  granularity: Granularity
): ChartBreakdownData | undefined {
  if (accounts.length === 0) return undefined;

  const range = resolveDateRange(chart.dateRange, snapshot);
  const buckets = makeTimeBuckets(range, granularity, weekStart);
  const transactionLookup = transactionsByAccount(snapshot.transactions);

  const accountContributions = new Map(
    accounts.map((account) => [
      account.id,
      buckets.reduce(
        (total, bucket) =>
          total + Math.abs(getAccountBalanceAtDate(account, transactionLookup, bucket.to)),
        0
      ) / buckets.length
    ])
  );
  const { primary: topAccounts, overflow: overflowAccounts } = selectBreakdownGroups(
    accounts,
    (account) => accountContributions.get(account.id) ?? 0
  );
  const hasOverflow = overflowAccounts.length > 0;

  const groups: BreakdownGroup[] = topAccounts.map((account) => ({
    key: account.id,
    label: account.name
  }));

  if (hasOverflow) {
    groups.push({ key: '__others__', label: 'Others' });
  }

  const breakdownPoints: BreakdownTimeSeriesPoint[] = buckets.map((bucket) => {
    const values: Record<string, Milliunits> = {};

    for (const account of topAccounts) {
      values[account.id] = getAccountBalanceAtDate(account, transactionLookup, bucket.to);
    }

    if (hasOverflow) {
      values['__others__'] = overflowAccounts.reduce(
        (total, account) => total + getAccountBalanceAtDate(account, transactionLookup, bucket.to),
        0
      );
    }

    return {
      bucketId: bucket.id,
      label: bucket.label,
      from: bucket.from,
      to: bucket.to,
      values
    };
  });

  return { dimension: 'account', groups, breakdownPoints };
}
