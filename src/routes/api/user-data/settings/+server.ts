import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { readUserSettings, writeUserSettings } from '$lib/server/user-settings';
import { weekStartSchema } from '$lib/app/settings';

const patchSchema = z.object({
  weekStart: weekStartSchema.optional(),
  selectedBudgetId: z.string().trim().min(1).nullable().optional()
});

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await readUserSettings(locals.user.id);
  return json(settings);
};

export const PATCH: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return json({ error: 'Invalid settings payload' }, { status: 400 });

  const { weekStart, selectedBudgetId } = parsed.data;
  const partial: Parameters<typeof writeUserSettings>[1] = {};
  if (weekStart !== undefined) partial.weekStart = weekStart;
  if (selectedBudgetId !== undefined) {
    partial.selectedBudgetId = selectedBudgetId ?? undefined;
  }

  const settings = await writeUserSettings(locals.user.id, partial);
  return json(settings);
};
