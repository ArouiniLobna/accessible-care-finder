import type { Database } from '../client';
import { buildSeedDataset, resolveDemoSessionDate } from './seed-data';
import { seedDatabase } from './seed';

/** Build the dataset for "now" (or DEMO_SESSION_DATE) and load it atomically. */
export async function resetDemoData(db: Database, now = new Date()) {
  const dataset = buildSeedDataset(resolveDemoSessionDate(now, process.env['DEMO_SESSION_DATE']));
  await db.transaction(async (tx) => {
    await seedDatabase(tx, dataset);
  });
  return dataset;
}
