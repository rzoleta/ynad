import { z } from 'zod';
import { patchUserSettings } from '$lib/app/budget-selection';

export const weekStartSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7)
]);

export type WeekStart = z.infer<typeof weekStartSchema>;

export const appSettingsSchema = z.object({
  weekStart: weekStartSchema.optional()
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

let cache: AppSettings | null = null;

export async function loadAppSettings(): Promise<AppSettings> {
  try {
    const response = await fetch('/api/user-data/settings');
    if (response.ok) {
      const parsed = appSettingsSchema.safeParse(await response.json());
      cache = parsed.success ? parsed.data : {};
    } else {
      cache = {};
    }
  } catch {
    cache = {};
  }

  return cache;
}

export function readSettings(): AppSettings {
  return cache ?? {};
}

export function writeSettings(settings: AppSettings) {
  cache = settings;
  void patchUserSettings(settings).catch(() => {});
}

export function getEffectiveWeekStart(settings = readSettings()): WeekStart {
  return settings.weekStart ?? getLocaleWeekStart();
}

function getLocaleWeekStart(): WeekStart {
  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
      weekInfo?: { firstDay?: number };
    };
    const firstDay = locale.weekInfo?.firstDay;
    return weekStartSchema.parse(firstDay);
  } catch {
    return 7;
  }
}
