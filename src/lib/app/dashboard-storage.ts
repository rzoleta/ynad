import {
  dashboardSchema,
  normalizeChartForType,
  type ChartConfig,
  type DashboardConfig
} from './chart-config';

function storageKey(budgetId: string) {
  return `ynad.dashboard.${budgetId}`;
}

export function readDashboard(budgetId: string | null): DashboardConfig {
  if (!budgetId || typeof localStorage === 'undefined') return { charts: [] };

  const raw = localStorage.getItem(storageKey(budgetId));
  if (!raw) return { charts: [] };

  try {
    const parsed = dashboardSchema.safeParse(JSON.parse(raw));
    return parsed.success ? normalizeDashboard(parsed.data) : { charts: [] };
  } catch {
    return { charts: [] };
  }
}

export function writeDashboard(budgetId: string, dashboard: DashboardConfig) {
  if (typeof localStorage === 'undefined') return;

  const normalized = normalizeDashboard(dashboard);
  const parsed = dashboardSchema.safeParse(normalized);
  localStorage.setItem(
    storageKey(budgetId),
    JSON.stringify(parsed.success ? parsed.data : { charts: [] })
  );
}

export function reorderCharts(charts: ChartConfig[], from: number, to: number) {
  const next = [...charts];
  const [item] = next.splice(from, 1);
  if (!item) return charts;
  next.splice(to, 0, item);
  return next;
}

function normalizeDashboard(dashboard: DashboardConfig): DashboardConfig {
  return {
    charts: dashboard.charts.map(normalizeChartForType)
  };
}
