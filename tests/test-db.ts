/**
 * Test Database Utilities
 *
 * Provides a Drizzle instance configured for the test database
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@/lib/db/schema';

/**
 * Creates a new test database connection pool
 * Uses environment variables configured in vitest.config.ts
 */
export const createTestPool = () => {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'askmymoney_test',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
};

/**
 * Creates a new Drizzle instance for tests
 */
export const createTestDb = () => {
  const pool = createTestPool();
  return drizzle(pool, { schema });
};

/**
 * Test database instance - use this in your tests
 */
export const testPool = createTestPool();
export const testDb = drizzle(testPool, { schema });

/**
 * Cleanup function - call this in afterAll hooks
 */
export const closeTestDb = async () => {
  await testPool.end();
};
