import { z } from 'zod';
import type { NormalizedBudgetData } from '$lib/domain/types';
import { UNCATEGORIZED_CATEGORY_ID } from '$lib/domain/categories';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const chartTypeSchema = z.enum(['balance', 'spending', 'income', 'number']);
export const visualizationSchema = z.enum(['line', 'bar', 'pie']);
export const chartSizeSchema = z.enum(['small', 'medium', 'large']);
export const granularitySchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);

export const datePresets = [
  'this-month',
  'this-year',
  'last-month',
  'last-year',
  'last-12-months',
  'last-24-months',
  'all-time',
  'custom'
] as const;

export const datePresetOptions = [
  { value: 'this-month', label: 'This Month', metadataLabel: 'This month' },
  { value: 'this-year', label: 'This Year', metadataLabel: 'This year' },
  { value: 'last-month', label: 'Last Month', metadataLabel: 'Last month' },
  { value: 'last-year', label: 'Last Year', metadataLabel: 'Last year' },
  { value: 'last-12-months', label: 'Last 12 Months', metadataLabel: 'Last 12 months' },
  { value: 'last-24-months', label: 'Last 24 Months', metadataLabel: 'Last 24 months' },
  { value: 'all-time', label: 'All Time', metadataLabel: 'All time' },
  { value: 'custom', label: 'Custom', metadataLabel: 'Custom' }
] satisfies Array<{ value: (typeof datePresets)[number]; label: string; metadataLabel: string }>;

export const datePresetSchema = z.enum(datePresets);

export const dateRangeSchema = z.discriminatedUnion('preset', [
  z.object({ preset: datePresetSchema.exclude(['custom']) }),
  z.object({
    preset: z.literal('custom'),
    from: z.string().regex(ISO_DATE_REGEX),
    to: z.string().regex(ISO_DATE_REGEX)
  })
]);

export const idFilterSchema = z.union([
  z.object({ mode: z.literal('all') }),
  z.object({ mode: z.literal('selected'), ids: z.array(z.string()) })
]);

export const filterSchema = idFilterSchema;

export const payeeRefSchema = z.object({
  id: z.string().nullable(),
  name: z.string().min(1)
});

export const payeeFilterSchema = z.union([
  z.object({ mode: z.literal('all') }),
  z.object({ mode: z.literal('selected'), payees: z.array(payeeRefSchema) })
]);

export const numberMetricSchema = z.enum(['balance', 'spending', 'income', 'net-income']);
export const numberOperationSchema = z.enum(['current', 'total', 'average', 'median']);

export const chartConfigSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  titleEdited: z.boolean().default(false),
  type: chartTypeSchema,
  size: chartSizeSchema,
  visualization: visualizationSchema.optional(),
  dateRange: dateRangeSchema,
  granularity: granularitySchema.optional(),
  accounts: idFilterSchema,
  categories: idFilterSchema.optional(),
  payees: payeeFilterSchema.optional(),
  numberMetric: numberMetricSchema.optional(),
  numberOperation: numberOperationSchema.optional(),
  numberPeriod: granularitySchema.optional()
});

export const dashboardSchema = z.object({
  charts: z.array(chartConfigSchema)
});

export type ChartType = z.infer<typeof chartTypeSchema>;
export type Visualization = z.infer<typeof visualizationSchema>;
export type ChartSize = z.infer<typeof chartSizeSchema>;
export type Granularity = z.infer<typeof granularitySchema>;
export type DatePreset = (typeof datePresets)[number];
export type DateRange = z.infer<typeof dateRangeSchema>;
export type IdFilter = z.infer<typeof idFilterSchema>;
export type PayeeRef = z.infer<typeof payeeRefSchema>;
export type PayeeFilter = z.infer<typeof payeeFilterSchema>;
export type NumberMetric = z.infer<typeof numberMetricSchema>;
export type NumberOperation = z.infer<typeof numberOperationSchema>;
export type ChartConfig = z.infer<typeof chartConfigSchema>;
export type DashboardConfig = z.infer<typeof dashboardSchema>;

const numberOperationDefaults = {
  balance: 'current',
  spending: 'total',
  income: 'total',
  'net-income': 'total'
} satisfies Record<NumberMetric, NumberOperation>;

const validNumberOperations: Record<NumberMetric, NumberOperation[]> = {
  balance: ['current', 'average', 'median'],
  spending: ['total', 'average', 'median'],
  income: ['total', 'average', 'median'],
  'net-income': ['total', 'average', 'median']
};

export function createDefaultChart(type: ChartType): ChartConfig {
  return normalizeChartForType({
    id: createChartId(),
    title: 'Monthly Spending',
    titleEdited: false,
    type,
    size: 'medium',
    visualization: type === 'number' ? undefined : 'bar',
    dateRange: { preset: 'last-12-months' },
    accounts: allIdFilter(),
    categories: allIdFilter(),
    payees: allPayeeFilter()
  });
}

export function normalizeChartForType(chart: ChartConfig): ChartConfig {
  const next: ChartConfig = {
    ...chart,
    dateRange: normalizeDateRange(chart.dateRange),
    accounts: normalizeIdFilter(chart.accounts)
  };

  if (next.type === 'number') {
    const metric = next.numberMetric ?? 'spending';

    next.visualization = undefined;
    next.granularity = undefined;
    next.numberMetric = metric;
    next.numberOperation = normalizeNumberOperation(metric, next.numberOperation);
    next.numberPeriod = next.numberPeriod ?? 'monthly';

    return maybeUpdateGeneratedTitle(next);
  }

  next.visualization = next.visualization ?? defaultVisualizationForType(next.type);
  next.granularity = next.visualization === 'pie' ? undefined : (next.granularity ?? 'monthly');
  next.numberMetric = undefined;
  next.numberOperation = undefined;
  next.numberPeriod = undefined;

  if (next.type === 'balance') {
    next.categories = undefined;
    next.payees = undefined;
    return maybeUpdateGeneratedTitle(next);
  }

  if (next.type === 'income') {
    next.categories = undefined;
    next.payees = normalizePayeeFilter(next.payees);
    return maybeUpdateGeneratedTitle(next);
  }

  next.categories = normalizeIdFilter(next.categories);
  next.payees = normalizePayeeFilter(next.payees);
  return maybeUpdateGeneratedTitle(next);
}

export function getGeneratedTitle(chart: ChartConfig): string {
  if (chart.type === 'balance') {
    if (chart.visualization === 'pie') return 'Balance by Account';
    return 'Net Worth';
  }

  if (chart.type === 'income') {
    if (chart.visualization === 'pie') return 'Income by Payee';
    return `${granularityTitle(chart.granularity ?? 'monthly')} Income`;
  }

  if (chart.type === 'number') {
    const metric = chart.numberMetric ?? 'spending';
    const operation = normalizeNumberOperation(metric, chart.numberOperation);
    const metricLabel = numberMetricLabel(metric);

    if (operation === 'current') return `Current ${metricLabel}`;
    if (operation === 'total') return `Total ${metricLabel}`;

    return `${numberOperationLabel(operation)} ${granularityTitle(
      chart.numberPeriod ?? 'monthly'
    )} ${metricLabel}`;
  }

  if (chart.visualization === 'pie') return 'Spending by Category';
  return `${granularityTitle(chart.granularity ?? 'monthly')} Spending`;
}

export function maybeUpdateGeneratedTitle(chart: ChartConfig): ChartConfig {
  if (chart.titleEdited) return chart;
  return { ...chart, title: getGeneratedTitle(chart) };
}

export function getChartMetadata(chart: ChartConfig, data?: NormalizedBudgetData): string {
  const normalized = normalizeChartForType(chart);
  const parts = [dateRangeLabel(normalized.dateRange)];

  if (normalized.type === 'number') {
    const metric = normalized.numberMetric ?? 'spending';
    const operation = normalizeNumberOperation(metric, normalized.numberOperation);

    parts.push(`${numberOperationLabel(operation)} ${numberMetricLabel(metric)}`);
    parts.push(granularityTitle(normalized.numberPeriod ?? 'monthly'));
  } else {
    parts.push(
      visualizationTitle(normalized.visualization ?? defaultVisualizationForType(normalized.type))
    );
    if (normalized.visualization !== 'pie')
      parts.push(granularityTitle(normalized.granularity ?? 'monthly'));
  }

  const accountSummary = selectedIdFilterSummary(
    normalized.accounts,
    'account',
    (id) => data?.accountById.get(id)?.name
  );
  if (accountSummary) parts.push(accountSummary);

  const categorySummary = selectedIdFilterSummary(normalized.categories, 'category', (id) => {
    if (id === UNCATEGORIZED_CATEGORY_ID) return 'Uncategorized';
    return data?.categoryById.get(id)?.name;
  });
  if (categorySummary) parts.push(categorySummary);

  const payeeSummary = selectedPayeeFilterSummary(normalized.payees);
  if (payeeSummary) parts.push(payeeSummary);

  return parts.filter(Boolean).join(' · ');
}

export function isChartPreviewable(chart: ChartConfig): boolean {
  const parsed = chartConfigSchema.safeParse(chart);
  if (!parsed.success) return false;

  const normalized = normalizeChartForType(parsed.data);

  if (!isDateRangePreviewable(normalized.dateRange)) return false;

  if (normalized.type === 'number') {
    const metric = normalized.numberMetric;
    const operation = normalized.numberOperation;
    return Boolean(
      metric &&
      operation &&
      normalized.numberPeriod &&
      validNumberOperations[metric].includes(operation)
    );
  }

  if (!normalized.visualization) return false;
  if (normalized.visualization !== 'pie' && !normalized.granularity) return false;

  return true;
}

function createChartId() {
  return globalThis.crypto?.randomUUID?.() ?? `chart-${Date.now()}-${Math.random()}`;
}

function allIdFilter(): IdFilter {
  return { mode: 'all' };
}

function allPayeeFilter(): PayeeFilter {
  return { mode: 'all' };
}

function normalizeIdFilter(filter: IdFilter | undefined): IdFilter {
  if (!filter || filter.mode === 'all') return allIdFilter();

  return {
    mode: 'selected',
    ids: [...new Set(filter.ids.filter(Boolean))]
  };
}

function normalizePayeeFilter(filter: PayeeFilter | undefined): PayeeFilter {
  if (!filter || filter.mode === 'all') return allPayeeFilter();

  const seen = new Set<string>();
  const payees = filter.payees.filter((payee) => {
    const key = payee.id ? `id:${payee.id}` : `name:${payee.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return payee.name.length > 0;
  });

  return { mode: 'selected', payees };
}

function normalizeDateRange(dateRange: DateRange): DateRange {
  if (dateRange.preset !== 'custom') return { preset: dateRange.preset };
  return { preset: 'custom', from: dateRange.from, to: dateRange.to };
}

function defaultVisualizationForType(type: Exclude<ChartType, 'number'>): Visualization {
  return type === 'balance' ? 'line' : 'bar';
}

function normalizeNumberOperation(
  metric: NumberMetric,
  operation: NumberOperation | undefined
): NumberOperation {
  if (operation && validNumberOperations[metric].includes(operation)) return operation;
  return numberOperationDefaults[metric];
}

function isDateRangePreviewable(dateRange: DateRange): boolean {
  if (dateRange.preset !== 'custom') return true;
  return (
    ISO_DATE_REGEX.test(dateRange.from) &&
    ISO_DATE_REGEX.test(dateRange.to) &&
    dateRange.from <= dateRange.to
  );
}

function dateRangeLabel(dateRange: DateRange) {
  if (dateRange.preset === 'custom') return `${dateRange.from} to ${dateRange.to}`;
  return (
    datePresetOptions.find((option) => option.value === dateRange.preset)?.metadataLabel ??
    dateRange.preset
  );
}

function visualizationTitle(visualization: Visualization) {
  if (visualization === 'line') return 'Line';
  if (visualization === 'bar') return 'Bar';
  return 'Pie';
}

function granularityTitle(granularity: Granularity) {
  if (granularity === 'daily') return 'Daily';
  if (granularity === 'weekly') return 'Weekly';
  if (granularity === 'yearly') return 'Yearly';
  return 'Monthly';
}

function numberMetricLabel(metric: NumberMetric) {
  if (metric === 'net-income') return 'Net Income';
  return titleCase(metric);
}

function numberOperationLabel(operation: NumberOperation) {
  return titleCase(operation);
}

function selectedIdFilterSummary(
  filter: IdFilter | undefined,
  noun: string,
  lookupName: (id: string) => string | undefined
) {
  if (!filter || filter.mode === 'all') return null;
  if (filter.ids.length === 0) return `No ${noun}s`;
  if (filter.ids.length === 1) return lookupName(filter.ids[0] ?? '') ?? `1 ${noun}`;
  return `${filter.ids.length} ${noun}s`;
}

function selectedPayeeFilterSummary(filter: PayeeFilter | undefined) {
  if (!filter || filter.mode === 'all') return null;
  if (filter.payees.length === 0) return 'No payees';
  if (filter.payees.length === 1) return filter.payees[0]?.name ?? '1 payee';
  return `${filter.payees.length} payees`;
}

function titleCase(value: string) {
  return value
    .split('-')
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}
