import { json, type RequestHandler } from '@sveltejs/kit';
import { fetchBudgetSelection, ynabErrorResponse } from '$lib/server/ynab';

export const GET: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const selection = await fetchBudgetSelection(locals.user.id, request.headers);
    return json(selection);
  } catch (error) {
    return ynabErrorResponse(error);
  }
};
