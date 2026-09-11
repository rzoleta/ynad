import { json, type RequestHandler } from '@sveltejs/kit';
import { fetchBudgetSelection } from '$lib/server/ynab';
import { ynabErrorResponse } from '$lib/server/ynab';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const selection = await fetchBudgetSelection(locals.user.id);
    return json(selection);
  } catch (error) {
    return ynabErrorResponse(error);
  }
};
