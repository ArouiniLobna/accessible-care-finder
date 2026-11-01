import { sql } from 'drizzle-orm';
import type { Executor } from '../client';
import {
  availabilitySlots,
  languages,
  services,
  supportRequestServices,
  supportRequests,
  workerLanguages,
  workerServices,
  workers,
} from '../schema';
import { LANGUAGES, SERVICES, type SeedDataset } from './seed-data';

function lookup<K extends string>(rows: { id: number; key: string }[], key: K): number {
  const row = rows.find((candidate) => candidate.key === key);
  if (!row) throw new Error(`Unknown seed reference "${key}"`);
  return row.id;
}

/**
 * Replace all data with the deterministic demo dataset.
 * Callers wrap this in a transaction so a reset is all-or-nothing.
 * Destructive — used by `pnpm db:seed`, `pnpm db:reset` and, later, the demo reset and tests.
 */
export async function seedDatabase(executor: Executor, dataset: SeedDataset): Promise<void> {
  await executor.execute(sql`
    TRUNCATE support_request_services, support_requests, availability_slots,
      worker_languages, worker_services, workers, languages, services
    RESTART IDENTITY CASCADE
  `);

  const serviceRows = (
    await executor
      .insert(services)
      .values([...SERVICES])
      .returning({ id: services.id, slug: services.slug })
  ).map((row) => ({ id: row.id, key: row.slug }));
  const languageRows = (
    await executor
      .insert(languages)
      .values([...LANGUAGES])
      .returning({ id: languages.id, code: languages.code })
  ).map((row) => ({ id: row.id, key: row.code }));

  await executor
    .insert(workers)
    .values(
      dataset.workers.map(({ services: _services, languages: _languages, ...worker }) => worker),
    );
  await executor
    .insert(workerServices)
    .values(
      dataset.workers.flatMap((worker) =>
        worker.services.map((slug) => ({
          workerId: worker.id,
          serviceId: lookup(serviceRows, slug),
        })),
      ),
    );
  await executor
    .insert(workerLanguages)
    .values(
      dataset.workers.flatMap((worker) =>
        worker.languages.map((code) => ({
          workerId: worker.id,
          languageId: lookup(languageRows, code),
        })),
      ),
    );
  await executor.insert(availabilitySlots).values(dataset.slots);

  const { services: requestServices, ...supportRequest } = dataset.supportRequest;
  await executor.insert(supportRequests).values(supportRequest);
  await executor.insert(supportRequestServices).values(
    requestServices.map((slug) => ({
      supportRequestId: supportRequest.id,
      serviceId: lookup(serviceRows, slug),
    })),
  );
}
