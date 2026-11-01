import { createDatabase } from '../client';
import { resetDemoData } from '../seed';
import { refuseInProduction, requireDatabaseUrl } from './script-env';

refuseInProduction('seed demo data');
const handle = createDatabase(requireDatabaseUrl(), 1);
try {
  const dataset = await resetDemoData(handle.db);
  const { year, month, day } = dataset.sessionDate;
  console.log(
    `✔ Seeded ${dataset.workers.length} fictional workers and ${dataset.slots.length} availability slots.`,
  );
  console.log(
    `  Demo session ${dataset.supportRequest.id}: ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 10:00–13:00 ${dataset.supportRequest.timezone}`,
  );
} finally {
  await handle.close();
}
