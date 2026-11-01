import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;
/** A transaction handle has the same query API as the database. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type Executor = Database | Transaction;

export interface DatabaseHandle {
  db: Database;
  pool: pg.Pool;
  close: () => Promise<void>;
}

export function createDatabase(connectionString: string, maxConnections = 10): DatabaseHandle {
  const pool = new pg.Pool({
    connectionString,
    max: maxConnections,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: 'accessible-care-finder-api',
  });
  const db = drizzle({ client: pool, schema });
  return { db, pool, close: () => pool.end() };
}

/** Postgres SQLSTATE for unique_violation. */
export const UNIQUE_VIOLATION = '23505';

export function isPgError(error: unknown): error is { code: string; constraint?: string } {
  return (
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
  );
}
