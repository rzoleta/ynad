import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { userSettings, type StoredUserSettings } from './db/schema';

export async function readUserSettings(userId: string): Promise<StoredUserSettings> {
  const rows = await getDb()
    .select({ settings: userSettings.settings })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return rows[0]?.settings ?? {};
}

export async function writeUserSettings(
  userId: string,
  partial: StoredUserSettings
): Promise<StoredUserSettings> {
  const current = await readUserSettings(userId);
  const next: StoredUserSettings = { ...current, ...partial };

  await getDb()
    .insert(userSettings)
    .values({ userId, settings: next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { settings: next, updatedAt: new Date() }
    });

  return next;
}
