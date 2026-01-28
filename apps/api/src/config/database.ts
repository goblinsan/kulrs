import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '@kulrs/db';

let _db: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Get database connection (lazy initialization)
 * This avoids errors at module load time when DATABASE_URL might not be available yet
 */
export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    const sql: NeonQueryFunction<false, false> = neon(connectionString);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

// For backward compatibility - but prefer using getDb()
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
