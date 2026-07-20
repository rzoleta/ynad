import type { Breakdown } from '$lib/app/chart-config';
import type { ISODate, Milliunits } from '$lib/domain/types';

export type ChartEmptyResult = {
  status: 'empty';
  message: string;
};

import type { YnabErrorCode } from '$lib/ynab/errors';

export type ChartErrorResult = {
  status: 'error';
  message: string;
  code?: YnabErrorCode;
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
  tooltipItems?: BreakdownTooltipItem[];
};

export type BreakdownGroup = {
  key: string;
  label: string;
};

export type BreakdownTooltipItem = {
  key: string;
  label: string;
  valueMilliunits: Milliunits;
};

export type BreakdownTimeSeriesPoint = {
  bucketId: string;
  label: string;
  from: ISODate;
  to: ISODate;
  values: Record<string, Milliunits>;
  tooltipItems?: Record<string, BreakdownTooltipItem[]>;
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

export function emptyChartResult(message = 'No matching data for this chart.'): ChartEmptyResult {
  return { status: 'empty', message };
}
