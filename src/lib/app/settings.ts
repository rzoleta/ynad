import { z } from 'zod';

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

const SETTINGS_KEY = 'ynad.settings';

export function getLocaleWeekStart(): WeekStart {
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

export function readSettings(): AppSettings {
	if (typeof localStorage === 'undefined') return {};

	const raw = localStorage.getItem(SETTINGS_KEY);
	if (!raw) return {};

	const parsed = appSettingsSchema.safeParse(JSON.parse(raw));
	return parsed.success ? parsed.data : {};
}

export function writeSettings(settings: AppSettings) {
	localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getEffectiveWeekStart(settings = readSettings()): WeekStart {
	return settings.weekStart ?? getLocaleWeekStart();
}
