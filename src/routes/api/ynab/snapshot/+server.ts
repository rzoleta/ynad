import { json, type RequestHandler } from '@sveltejs/kit';
import { fetchRawBudgetSnapshot, ynabErrorResponse } from '$lib/server/ynab';

export const GET: RequestHandler = async ({ locals, url, request }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const budgetId = url.searchParams.get('budgetId')?.trim();
  if (!budgetId) return json({ error: 'budgetId is required' }, { status: 400 });

  try {
    const snapshot = await fetchRawBudgetSnapshot(locals.user.id, budgetId, request.headers);
    return json(snapshot);
  } catch (error) {
    return ynabErrorResponse(error);
  }
};
