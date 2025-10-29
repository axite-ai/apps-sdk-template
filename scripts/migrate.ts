#!/usr/bin/env tsx

/**
 * Database Migration Runner
 *
 * Runs all SQL migration files in the migrations/ directory
 * Usage: pnpm tsx scripts/migrate.ts
 */

import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'askmymoney',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting database migrations...\n');

    // Create migrations table to track which migrations have run
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        executed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Get list of migration files
    const migrationsDir = join(process.cwd(), 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Check which migrations have already run
    const { rows: executedMigrations } = await client.query(
      'SELECT filename FROM migrations'
    );
    const executedSet = new Set(executedMigrations.map(r => r.filename));

    let migrationsRan = 0;

    for (const filename of migrationFiles) {
      if (executedSet.has(filename)) {
        console.log(`⏭️  Skipping ${filename} (already executed)`);
        continue;
      }

      console.log(`▶️  Running ${filename}...`);

      const sql = readFileSync(join(migrationsDir, filename), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        console.log(`✅ ${filename} completed\n`);
        migrationsRan++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ ${filename} failed:`);
        console.error(error);
        throw error;
      }
    }

    if (migrationsRan === 0) {
      console.log('✨ All migrations already up to date!');
    } else {
      console.log(`\n🎉 Successfully ran ${migrationsRan} migration(s)!`);
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
