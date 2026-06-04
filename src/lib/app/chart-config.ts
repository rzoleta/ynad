import { z } from 'zod';

export const chartTypeSchema = z.enum(['balance', 'spending', 'income', 'number']);
export const visualizationSchema = z.enum(['line', 'bar', 'pie']);
export const chartSizeSchema = z.enum(['small', 'medium', 'large']);
export const granularitySchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export const datePresetSchema = z.enum([
  'this-month',
  'this-year',
  'last-month',
  'last-year',
  'last-12-months',
  'custom'
]);
export const numberMetricSchema = z.enum(['balance', 'spending', 'income', 'net-income']);
export const numberOperationSchema = z.enum(['current', 'total', 'average', 'median']);

const selectedFilterSchema = z.object({
  mode: z.literal('selected'),
  ids: z.array(z.string())
});

const allFilterSchema = z.object({
  mode: z.literal('all')
});

export const filterSchema = z.union([allFilterSchema, selectedFilterSchema]);

export const payeeFilterSchema = z.union([
  allFilterSchema,
  z.object({
    mode: z.literal('selected'),
    payees: z.array(
      z.object({
        id: z.string().nullable(),
        name: z.string()
      })
    )
  })
]);

export const dateRangeSchema = z.discriminatedUnion('preset', [
  z.object({ preset: datePresetSchema.exclude(['custom']) }),
  z.object({ preset: z.literal('custom'), from: z.string(), to: z.string() })
]);

export const chartConfigSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  titleEdited: z.boolean().default(false),
  type: chartTypeSchema,
  size: chartSizeSchema,
  visualization: visualizationSchema.optional(),
  dateRange: dateRangeSchema,
  granularity: granularitySchema.optional(),
  accounts: filterSchema,
  categories: filterSchema.optional(),
  payees: payeeFilterSchema.optional(),
  numberMetric: numberMetricSchema.optional(),
  numberOperation: numberOperationSchema.optional(),
  numberPeriod: granularitySchema.optional()
});

export const dashboardSchema = z.object({
  charts: z.array(chartConfigSchema)
});

export type ChartType = z.infer<typeof chartTypeSchema>;
export type ChartConfig = z.infer<typeof chartConfigSchema>;
export type DashboardConfig = z.infer<typeof dashboardSchema>;

export function createDefaultChart(type: ChartType): ChartConfig {
  const id = crypto.randomUUID();
  const isNumber = type === 'number';

  return {
    id,
    type,
    title: getGeneratedTitle(type),
    titleEdited: false,
    size: isNumber ? 'small' : 'medium',
    visualization: isNumber ? undefined : type === 'balance' ? 'line' : 'bar',
    dateRange: { preset: 'this-month' },
    granularity: isNumber ? undefined : 'monthly',
    accounts: { mode: 'all' },
    categories: type === 'spending' ? { mode: 'all' } : undefined,
    payees: type === 'spending' || type === 'income' ? { mode: 'all' } : undefined,
    numberMetric: isNumber ? 'spending' : undefined,
    numberOperation: isNumber ? 'total' : undefined,
    numberPeriod: isNumber ? 'monthly' : undefined
  };
}

export function getGeneratedTitle(type: ChartType) {
  if (type === 'balance') return 'Net Worth';
  if (type === 'spending') return 'Monthly Spending';
  if (type === 'income') return 'Monthly Income';
  return 'Total Spending';
}

export function getChartMetadata(chart: ChartConfig) {
  const date = chart.dateRange.preset.replaceAll('-', ' ');
  const visual = chart.visualization ?? chart.numberOperation ?? 'number';
  const period = chart.granularity ?? chart.numberPeriod;
  return [date, period, visual].filter(Boolean).join(' · ');
}
