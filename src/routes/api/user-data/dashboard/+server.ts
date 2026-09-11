import { json, type RequestHandler } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { dashboards } from '$lib/server/db/schema';
import { dashboardSchema, normalizeChartForType } from '$lib/app/chart-config';

const BUDGET_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const budgetId = url.searchParams.get('budgetId')?.trim();
  if (!budgetId || !BUDGET_ID_PATTERN.test(budgetId)) {
    return json({ error: 'budgetId is required' }, { status: 400 });
  }

  const rows = await getDb()
    .select({ charts: dashboards.charts, updatedAt: dashboards.updatedAt })
    .from(dashboards)
    .where(and(eq(dashboards.userId, locals.user.id), eq(dashboards.budgetId, budgetId)))
    .limit(1);

  if (rows.length === 0) return json({ error: 'Not found' }, { status: 404 });

  return json({ charts: rows[0].charts });
};

export const PUT: RequestHandler = async ({ locals, url, request }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const budgetId = url.searchParams.get('budgetId')?.trim();
  if (!budgetId || !BUDGET_ID_PATTERN.test(budgetId)) {
    return json({ error: 'budgetId is required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = dashboardSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Invalid dashboard payload' }, { status: 400 });
  }

  const charts = parsed.data.charts.map(normalizeChartForType);

  await getDb()
    .insert(dashboards)
    .values({ userId: locals.user.id, budgetId, charts, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [dashboards.userId, dashboards.budgetId],
      set: { charts, updatedAt: new Date() }
    });

  return json({ charts });
};
