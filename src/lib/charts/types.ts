import type { Breakdown } from '$lib/app/chart-config';
import type { ISODate, Milliunits } from '$lib/domain/types';

export type ChartEmptyResult = {
  status: 'empty';
  message: string;
};

export type ChartErrorResult = {
  status: 'error';
  message: string;
};

export type TimeSeriesPoint = {
  bucketId: string;
  label: string;
  from: ISODate;
  to: ISODate;
  valueMilliunits: Milliunits;
};

export type PieSlicePoint = {
  key: string;
  label: string;
  valueMilliunits: Milliunits;
};

export type BreakdownGroup = {
  key: string;
  label: string;
};

export type BreakdownTimeSeriesPoint = {
  bucketId: string;
  label: string;
  from: ISODate;
  to: ISODate;
  values: Record<string, Milliunits>;
};

export type ChartBreakdownData = {
  dimension: Exclude<Breakdown, 'none'>;
  groups: BreakdownGroup[];
  breakdownPoints: BreakdownTimeSeriesPoint[];
};

export type ChartSeriesResult = {
  status: 'series';
  visualization: 'line' | 'bar' | 'pie';
  points: TimeSeriesPoint[] | PieSlicePoint[];
  breakdown?: ChartBreakdownData;
  excluded?: Array<{
    key: string;
    label: string;
    valueMilliunits: Milliunits;
    reason: 'non-positive-pie-slice';
  }>;
};

export type ChartNumberResult = {
  status: 'number';
  valueMilliunits: Milliunits;
  label: string;
};

export type ChartResult =
  | ChartEmptyResult
  | ChartErrorResult
  | ChartSeriesResult
  | ChartNumberResult;

const CHART_COLOR_COUNT = 5;

export function chartColorForKey(key: string): string {
  let hash = 0;

  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }

  const colorIndex = Math.abs(hash) % CHART_COLOR_COUNT;
  return `var(--chart-${colorIndex + 1})`;
}

export function emptyChartResult(message = 'No matching data for this chart.'): ChartEmptyResult {
  return { status: 'empty', message };
}
