import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema';

/**
 * Create a database client using the provided connection string
 * @param connectionString - PostgreSQL connection string
 * @returns Drizzle database instance
 */
export function createDbClient(connectionString: string) {
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

/**
 * Get database client from environment variable
 * @returns Drizzle database instance
 */
export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  return createDbClient(connectionString);
}

export type DbClient = ReturnType<typeof getDb>;
