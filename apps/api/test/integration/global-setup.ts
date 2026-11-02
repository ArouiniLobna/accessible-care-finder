import { sql } from 'drizzle-orm';
import { createDatabase } from '../../src/db/client';
import { runMigrations } from '../../src/db/migrations';

function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL must be set to run integration tests.');
  }
  return url;
}

/** Fresh schema for each integration run: drop everything, apply committed migrations. */
export default async function setup() {
  const url = testDatabaseUrl();
  const handle = createDatabase(url, 1);
  try {
    await handle.db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await handle.db.execute(sql`DROP SCHEMA public CASCADE`);
    await handle.db.execute(sql`CREATE SCHEMA public`);
  } finally {
    await handle.close();
  }
  await runMigrations(url);
}
