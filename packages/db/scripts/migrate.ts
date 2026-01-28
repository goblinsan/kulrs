import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('🔄 Running database migrations...');
  
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);
  
  try {
    await migrate(db, { 
      migrationsFolder: join(import.meta.dirname, '../migrations'),
    });
    
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error(err);
  process.exit(1);
});
