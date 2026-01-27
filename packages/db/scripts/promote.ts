import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import dotenv from 'dotenv';
import { join } from 'path';
import { readdir } from 'fs/promises';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Database promotion script
 * Promotes migrations from development to production
 * 
 * Usage:
 *   DEV_DATABASE_URL=<dev-url> PROD_DATABASE_URL=<prod-url> npm run db:promote
 * 
 * This script:
 * 1. Validates both database connections
 * 2. Checks migrations applied to dev
 * 3. Applies same migrations to prod
 * 4. Verifies both databases are in sync
 */

async function getAppliedMigrations(db: any): Promise<string[]> {
  try {
    const result = await db.execute(`
      SELECT tag FROM drizzle.__drizzle_migrations 
      ORDER BY created_at ASC
    `);
    return result.rows.map((row: any) => row.tag);
  } catch (error) {
    // Table doesn't exist yet, no migrations applied
    return [];
  }
}

async function promote() {
  const devUrl = process.env.DEV_DATABASE_URL;
  const prodUrl = process.env.PROD_DATABASE_URL;

  if (!devUrl || !prodUrl) {
    console.error('❌ Error: Both DEV_DATABASE_URL and PROD_DATABASE_URL must be set');
    console.log('\nUsage:');
    console.log('  DEV_DATABASE_URL=<dev-url> PROD_DATABASE_URL=<prod-url> npm run db:promote');
    process.exit(1);
  }

  console.log('🔄 Database Promotion Script\n');
  
  // Connect to dev database
  console.log('📡 Connecting to development database...');
  const devPool = new Pool({ connectionString: devUrl });
  const devDb = drizzle(devPool);
  
  // Connect to prod database
  console.log('📡 Connecting to production database...');
  const prodPool = new Pool({ connectionString: prodUrl });
  const prodDb = drizzle(prodPool);

  try {
    // Check applied migrations on both databases
    console.log('\n📋 Checking migration status...');
    const devMigrations = await getAppliedMigrations(devDb);
    const prodMigrations = await getAppliedMigrations(prodDb);

    console.log(`  Development: ${devMigrations.length} migrations applied`);
    console.log(`  Production:  ${prodMigrations.length} migrations applied`);

    // Get list of all available migrations
    const migrationsDir = join(import.meta.dirname, '../migrations');
    const files = await readdir(migrationsDir);
    const availableMigrations = files
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`  Available:   ${availableMigrations.length} migration files\n`);

    // Check if dev is ahead of prod
    if (devMigrations.length === prodMigrations.length) {
      console.log('✅ Production is up to date with development');
      console.log('   No migrations to promote.');
      return;
    }

    if (devMigrations.length < prodMigrations.length) {
      console.error('⚠️  Warning: Production has more migrations than development!');
      console.error('   This is an unexpected state. Please investigate.');
      process.exit(1);
    }

    // Calculate migrations to promote
    const migrationsToPromote = devMigrations.slice(prodMigrations.length);
    console.log(`🚀 Promoting ${migrationsToPromote.length} migration(s) to production:\n`);
    migrationsToPromote.forEach((migration, index) => {
      console.log(`   ${index + 1}. ${migration}`);
    });

    console.log('\n⚠️  WARNING: This will modify the production database!');
    console.log('   Press Ctrl+C to cancel within 5 seconds...\n');
    
    // Wait 5 seconds before proceeding
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📝 Applying migrations to production...\n');
    
    // Apply migrations to production
    await migrate(prodDb, {
      migrationsFolder: migrationsDir,
    });

    // Verify migrations were applied
    const newProdMigrations = await getAppliedMigrations(prodDb);
    
    if (newProdMigrations.length === devMigrations.length) {
      console.log('\n✅ Promotion successful!');
      console.log(`   Production now has ${newProdMigrations.length} migrations applied`);
      console.log('   Development and production databases are in sync\n');
    } else {
      console.error('\n❌ Promotion failed!');
      console.error(`   Expected ${devMigrations.length} migrations, but production has ${newProdMigrations.length}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Promotion failed:', error);
    throw error;
  } finally {
    await devPool.end();
    await prodPool.end();
  }
}

promote().catch((err) => {
  console.error(err);
  process.exit(1);
});
