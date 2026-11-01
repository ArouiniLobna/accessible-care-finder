import { asc } from 'drizzle-orm';
import type { Language, Service } from '@acf/contracts';
import type { Executor } from '../../db/client';
import { languages, services } from '../../db/schema';

export function createMetadataRepository(db: Executor) {
  return {
    async listServices(): Promise<Service[]> {
      return db
        .select({ id: services.slug, name: services.name })
        .from(services)
        .orderBy(asc(services.id));
    },
    async listLanguages(): Promise<Language[]> {
      return db
        .select({ code: languages.code, name: languages.name })
        .from(languages)
        .orderBy(asc(languages.id));
    },
  };
}

export type MetadataRepository = ReturnType<typeof createMetadataRepository>;
