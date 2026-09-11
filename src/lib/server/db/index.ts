import { env } from '$env/dynamic/private';
import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export type Database = NeonHttpDatabase<typeof schema>;

let instance: Database | null = null;

export function getDb(): Database {
  if (!instance) {
    const url = env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    instance = drizzle(neon(url), { schema });
  }
  return instance;
}
