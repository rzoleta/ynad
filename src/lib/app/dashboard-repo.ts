import {
  dashboardSchema,
  type ChartSize,
  normalizeChartForType,
  type ChartConfig,
  type DashboardConfig
} from './chart-config';

const WRITE_DEBOUNCE_MS = 500;

let pendingWrite: ReturnType<typeof setTimeout> | null = null;

export async function fetchDashboard(budgetId: string): Promise<DashboardConfig> {
  const response = await fetch(`/api/user-data/dashboard?budgetId=${encodeURIComponent(budgetId)}`);

  if (response.status === 404) return createDefaultDashboard();
  if (!response.ok) throw new Error(`Dashboard request failed (${response.status}).`);

  const body = (await response.json()) as { charts?: unknown };
  const parsed = dashboardSchema.safeParse({ charts: body.charts });
  return parsed.success ? normalizeDashboard(parsed.data) : { charts: [] };
}

export function scheduleDashboardWrite(budgetId: string, dashboard: DashboardConfig) {
  if (pendingWrite) clearTimeout(pendingWrite);

  pendingWrite = setTimeout(() => {
    pendingWrite = null;
    void saveDashboard(budgetId, dashboard);
  }, WRITE_DEBOUNCE_MS);
}

export async function saveDashboard(budgetId: string, dashboard: DashboardConfig) {
  const normalized = normalizeDashboard(dashboard);
  const parsed = dashboardSchema.safeParse(normalized);
  const payload = parsed.success ? parsed.data : { charts: [] };

  await fetch(`/api/user-data/dashboard?budgetId=${encodeURIComponent(budgetId)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function createDefaultDashboard(): DashboardConfig {
  const allIds = { mode: 'all' } as const;
  const allPayees = { mode: 'all' } as const;

  return {
    charts: [
      {
        id: createChartId(),
        title: 'Current Balance',
        titleEdited: true,
        type: 'balance',
        size: 'small',
        visualization: 'number',
        dateRange: { preset: 'last-12-months' },
        granularity: 'monthly',
        accounts: allIds,
        numberOperation: 'current'
      },
      {
        id: createChartId(),
        title: 'Spending This Month',
        titleEdited: true,
        type: 'spending',
        size: 'small',
        visualization: 'number',
        dateRange: { preset: 'this-month' },
        granularity: 'monthly',
        accounts: allIds,
        categories: allIds,
        payees: allPayees,
        numberOperation: 'total'
      },
      {
        id: createChartId(),
        title: 'Income This Month',
        titleEdited: true,
        type: 'income',
        size: 'small',
        visualization: 'number',
        dateRange: { preset: 'this-month' },
        granularity: 'monthly',
        accounts: allIds,
        categories: allIds,
        payees: allPayees,
        numberOperation: 'total'
      },
      {
        id: createChartId(),
        title: 'Net Worth',
        titleEdited: true,
        type: 'balance',
        size: 'large',
        visualization: 'line',
        breakdown: 'none',
        dateRange: { preset: 'all-time' },
        granularity: 'monthly',
        accounts: allIds
      },
      {
        id: createChartId(),
        title: 'Monthly Spending',
        titleEdited: true,
        type: 'spending',
        size: 'medium',
        visualization: 'bar',
        breakdown: 'category-group',
        dateRange: { preset: 'last-12-months' },
        granularity: 'monthly',
        accounts: allIds,
        categories: allIds,
        payees: allPayees
      },
      {
        id: createChartId(),
        title: 'Spending by Category Group',
        titleEdited: true,
        type: 'spending',
        size: 'small',
        visualization: 'pie',
        breakdown: 'category-group',
        dateRange: { preset: 'last-12-months' },
        accounts: allIds,
        categories: allIds,
        payees: allPayees
      }
    ]
  };
}

export function reorderCharts(charts: ChartConfig[], from: number, to: number) {
  const next = [...charts];
  const [item] = next.splice(from, 1);
  if (!item) return charts;
  next.splice(to, 0, item);
  return next;
}

export function cloneDashboardChart(chart: ChartConfig): ChartConfig {
  return JSON.parse(JSON.stringify(chart)) as ChartConfig;
}

export function duplicateDashboardChart(chart: ChartConfig): ChartConfig {
  return normalizeChartForType({
    ...cloneDashboardChart(chart),
    id: createChartId(),
    title: `${chart.title} copy`,
    titleEdited: true
  });
}

export function resizeDashboardChart(
  charts: ChartConfig[],
  chartId: string,
  size: ChartSize
): ChartConfig[] {
  return charts.map((chart) =>
    chart.id === chartId ? normalizeChartForType({ ...chart, size }) : chart
  );
}

function normalizeDashboard(dashboard: DashboardConfig): DashboardConfig {
  return {
    charts: dashboard.charts.map(normalizeChartForType)
  };
}

function createChartId() {
  return globalThis.crypto?.randomUUID?.() ?? `chart-${Date.now()}-${Math.random()}`;
}
