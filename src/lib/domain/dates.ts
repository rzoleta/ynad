import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subYears
} from 'date-fns';
import type { ChartConfig } from '$lib/app/chart-config';
import type { WeekStart } from '$lib/app/settings';
import type { ISODate } from './types';

export type DatePreset =
  | 'this-month'
  | 'this-year'
  | 'last-month'
  | 'last-year'
  | 'last-12-months'
  | 'last-24-months'
  | 'custom';

export type ResolvedDateRange = {
  from: ISODate;
  to: ISODate;
};

export type TimeBucket = {
  id: string;
  label: string;
  from: ISODate;
  to: ISODate;
};

export function resolveDateRange(
  config: ChartConfig['dateRange'],
  today = new Date()
): ResolvedDateRange {
  if (config.preset === 'custom') return { from: config.from, to: config.to };
  if (config.preset === 'this-year') return localDateRange(startOfYear(today), endOfYear(today));
  if (config.preset === 'last-month') {
    const date = subMonths(today, 1);
    return localDateRange(startOfMonth(date), endOfMonth(date));
  }
  if (config.preset === 'last-year') {
    const date = subYears(today, 1);
    return localDateRange(startOfYear(date), endOfYear(date));
  }
  if (config.preset === 'last-12-months') {
    return localDateRange(startOfMonth(subMonths(today, 11)), today);
  }
  if (config.preset === 'last-24-months') {
    return localDateRange(startOfMonth(subMonths(today, 23)), today);
  }

  return localDateRange(startOfMonth(today), endOfMonth(today));
}

export function makeTimeBuckets(
  range: ResolvedDateRange,
  granularity: NonNullable<ChartConfig['granularity']>,
  weekStart: WeekStart
): TimeBucket[] {
  const buckets: TimeBucket[] = [];
  const start = parseISODate(range.from);
  const end = parseISODate(range.to);
  let cursor = getBucketStart(start, granularity, weekStart);

  while (cursor <= end) {
    const bucketStart = new Date(cursor);
    const bucketEnd = getBucketEnd(bucketStart, granularity, weekStart);
    const from = maxDate(bucketStart, start);
    const to = minDate(bucketEnd, end);
    const fromIso = formatLocalISODate(from);
    const toIso = formatLocalISODate(to);

    buckets.push({
      id: `${granularity}:${fromIso}:${toIso}`,
      label: formatBucketLabel(from, granularity),
      from: fromIso,
      to: toIso
    });

    cursor = getNextBucketStart(bucketStart, granularity);
  }

  return buckets;
}

export function compareIsoDate(left: ISODate, right: ISODate): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function isIsoDateInRange(date: ISODate, range: ResolvedDateRange): boolean {
  return compareIsoDate(date, range.from) >= 0 && compareIsoDate(date, range.to) <= 0;
}

function localDateRange(from: Date, to: Date): ResolvedDateRange {
  return { from: formatLocalISODate(from), to: formatLocalISODate(to) };
}

function parseISODate(value: ISODate): Date {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalISODate(date: Date): ISODate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getBucketStart(
  date: Date,
  granularity: NonNullable<ChartConfig['granularity']>,
  weekStart: WeekStart
) {
  if (granularity === 'weekly') {
    return startOfWeek(date, { weekStartsOn: toDateFnsWeekStart(weekStart) });
  }
  if (granularity === 'monthly') return startOfMonth(date);
  if (granularity === 'yearly') return startOfYear(date);
  return date;
}

function getBucketEnd(
  bucketStart: Date,
  granularity: NonNullable<ChartConfig['granularity']>,
  weekStart: WeekStart
) {
  if (granularity === 'weekly') {
    return endOfWeek(bucketStart, { weekStartsOn: toDateFnsWeekStart(weekStart) });
  }
  if (granularity === 'monthly') return endOfMonth(bucketStart);
  if (granularity === 'yearly') return endOfYear(bucketStart);
  return bucketStart;
}

function getNextBucketStart(
  bucketStart: Date,
  granularity: NonNullable<ChartConfig['granularity']>
) {
  if (granularity === 'daily') return addDays(bucketStart, 1);
  if (granularity === 'weekly') return addWeeks(bucketStart, 1);
  if (granularity === 'yearly') return addYears(bucketStart, 1);
  return addMonths(bucketStart, 1);
}

function toDateFnsWeekStart(weekStart: WeekStart): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return (weekStart % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

function maxDate(left: Date, right: Date) {
  return left > right ? left : right;
}

function minDate(left: Date, right: Date) {
  return left < right ? left : right;
}

function formatBucketLabel(date: Date, granularity: NonNullable<ChartConfig['granularity']>) {
  if (granularity === 'monthly') {
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }
  if (granularity === 'yearly') return String(date.getFullYear());

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
