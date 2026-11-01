/**
 * DESTRUCTIVE, development only: drops every table, re-runs migrations and reseeds.
 */
import { sql } from 'drizzle-orm';
import { createDatabase } from '../client';
import { runMigrations } from '../migrations';
import { resetDemoData } from '../seed';
import { refuseInProduction, requireDatabaseUrl } from './script-env';

refuseInProduction('reset the database');
const databaseUrl = requireDatabaseUrl();

const dropHandle = createDatabase(databaseUrl, 1);
try {
  await dropHandle.db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await dropHandle.db.execute(sql`DROP SCHEMA public CASCADE`);
  await dropHandle.db.execute(sql`CREATE SCHEMA public`);
} finally {
  await dropHandle.close();
}
console.log('✔ Dropped all tables');

await runMigrations(databaseUrl);
console.log('✔ Migrations applied');

const seedHandle = createDatabase(databaseUrl, 1);
try {
  const dataset = await resetDemoData(seedHandle.db);
  console.log(`✔ Seeded ${dataset.workers.length} fictional workers`);
} finally {
  await seedHandle.close();
}
