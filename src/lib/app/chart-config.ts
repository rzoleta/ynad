import { z } from 'zod';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const chartTypeSchema = z.enum(['balance', 'spending', 'income', 'number']);
export const visualizationSchema = z.enum(['line', 'bar', 'pie']);
export const chartSizeSchema = z.enum(['small', 'medium', 'large']);
export const granularitySchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export const breakdownSchema = z.enum(['none', 'account', 'category', 'category-group', 'payee']);

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
  breakdown: breakdownSchema.optional(),
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
export type Breakdown = z.infer<typeof breakdownSchema>;
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
    breakdown: 'none',
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
    next.breakdown = undefined;
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

  if (next.visualization === 'pie') {
    if (next.type === 'spending' || next.type === 'income') {
      next.breakdown = normalizePieBreakdownForType(next.type, next.breakdown);
    } else {
      next.breakdown = undefined;
    }
  } else {
    next.breakdown = normalizeBreakdownForType(next.type, next.breakdown);
  }

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
    if (chart.visualization === 'pie') {
      return `Income by ${breakdownLabel(chart.breakdown ?? 'payee')}`;
    }
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

  if (chart.visualization === 'pie') {
    return `Spending by ${breakdownLabel(chart.breakdown ?? 'category')}`;
  }
  return `${granularityTitle(chart.granularity ?? 'monthly')} Spending`;
}

export function maybeUpdateGeneratedTitle(chart: ChartConfig): ChartConfig {
  if (chart.titleEdited) return chart;
  return { ...chart, title: getGeneratedTitle(chart) };
}

export function getChartMetadata(chart: ChartConfig): string {
  const normalized = normalizeChartForType(chart);
  const parts: string[] = [];

  const isBalancePie = normalized.type === 'balance' && normalized.visualization === 'pie';

  if (!isBalancePie) {
    parts.push(dateRangeLabel(normalized.dateRange));
  }

  if (normalized.type !== 'number' && normalized.visualization !== 'pie') {
    parts.push(granularityTitle(normalized.granularity ?? 'monthly'));
  }

  return parts.filter(Boolean).join(' · ');
}

export function isChartPreviewable(chart: ChartConfig): boolean {
  const parsed = chartConfigSchema.safeParse(chart);
  if (!parsed.success) return false;

  const normalized = normalizeChartForType(parsed.data);

  const isBalancePie = normalized.type === 'balance' && normalized.visualization === 'pie';

  if (!isBalancePie && !isDateRangePreviewable(normalized.dateRange)) return false;

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

function normalizeBreakdownForType(type: ChartType, breakdown: Breakdown | undefined): Breakdown {
  if (!breakdown || breakdown === 'none') return 'none';

  if (type === 'balance') {
    return breakdown === 'account' ? 'account' : 'none';
  }

  if (type === 'spending' || type === 'income') {
    if (
      breakdown === 'account' ||
      breakdown === 'category' ||
      breakdown === 'category-group' ||
      breakdown === 'payee'
    ) {
      return breakdown;
    }
  }

  return 'none';
}

function normalizePieBreakdownForType(
  type: 'spending' | 'income',
  breakdown: Breakdown | undefined
): Breakdown {
  if (
    breakdown === 'account' ||
    breakdown === 'category' ||
    breakdown === 'category-group' ||
    breakdown === 'payee'
  ) {
    return breakdown;
  }

  return type === 'spending' ? 'category' : 'payee';
}

function breakdownLabel(breakdown: Breakdown): string {
  if (breakdown === 'account') return 'Account';
  if (breakdown === 'category') return 'Category';
  if (breakdown === 'category-group') return 'Category Group';
  if (breakdown === 'payee') return 'Payee';
  return 'None';
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

function titleCase(value: string) {
  return value
    .split('-')
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

export function getBreakdownOptions(
  type: ChartType,
  visualization: Visualization | undefined
): Array<{ value: Breakdown; label: string }> {
  if (type === 'balance') {
    return [
      { value: 'none', label: 'None' },
      { value: 'account', label: 'Account' }
    ];
  }

  if (type === 'spending' || type === 'income') {
    if (visualization === 'pie') {
      return [
        { value: 'account', label: 'Account' },
        { value: 'category', label: 'Category' },
        { value: 'category-group', label: 'Category Group' },
        { value: 'payee', label: 'Payee' }
      ];
    }

    return [
      { value: 'none', label: 'None' },
      { value: 'account', label: 'Account' },
      { value: 'category', label: 'Category' },
      { value: 'category-group', label: 'Category Group' },
      { value: 'payee', label: 'Payee' }
    ];
  }

  return [{ value: 'none', label: 'None' }];
}
