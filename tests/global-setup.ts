import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

/**
 * Global setup - runs once before all test files
 * Creates test database and applies migrations using Drizzle
 */
export default async () => {
  const dbName = process.env.POSTGRES_DB || 'askmymoney_test';

  // Connect to postgres database to create/check test database
  const adminPool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: 'postgres', // Connect to default database
  });

  const adminDb = drizzle(adminPool);

  try {
    // Check if test database exists
    const result = await adminDb.execute(
      sql`SELECT 1 FROM pg_database WHERE datname = ${dbName}`
    );

    if (result.rowCount === 0) {
      console.log(`Creating test database: ${dbName}`);
      // Note: CREATE DATABASE cannot be parameterized, but dbName is from our config
      await adminDb.execute(sql.raw(`CREATE DATABASE ${dbName}`));
    } else {
      console.log(`Test database ${dbName} already exists.`);
    }
  } catch (error) {
    console.error('Failed to create test database:', error);
    throw error;
  } finally {
    await adminPool.end();
  }

  // Apply migrations to the test database programmatically
  const testPool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: dbName,
  });
  const testDb = drizzle(testPool);

  try {
    console.log(`Applying migrations to ${dbName}...`);
    await migrate(testDb, { migrationsFolder: './drizzle' });
    console.log('Migrations applied successfully.');
  } catch (error) {
    console.error('Failed to apply migrations:', error);
    throw error;
  } finally {
    await testPool.end();
  }

  /**
   * Teardown function - runs once after all test files
   * Drops the test database
   */
  return async () => {
    const adminPool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: 'postgres',
    });

    const adminDb = drizzle(adminPool);

    try {
      console.log(`Dropping test database: ${dbName}`);

      // Terminate any active connections first
      await adminDb.execute(sql`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = ${dbName}
          AND pid <> pg_backend_pid()
      `);

      // Drop the database
      await adminDb.execute(sql.raw(`DROP DATABASE IF EXISTS ${dbName}`));
    } catch (error) {
      console.error('Failed to drop test database:', error);
    } finally {
      await adminPool.end();
    }
  };
};
