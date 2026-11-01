import type { SearchWorkersRequest, SearchWorkersResponse, WorkerProfile } from '@acf/contracts';
import { notFound, validationError } from '../../shared/errors';
import type { MetadataRepository } from '../metadata/metadata.repository';
import type { SupportRequestRepository } from '../support-requests/support-request.repository';
import { decodeCursor, encodeCursor } from './search-cursor';
import type { WorkerRepository } from './worker.repository';

interface Dependencies {
  workers: WorkerRepository;
  supportRequests: SupportRequestRepository;
  metadata: MetadataRepository;
}

export function createWorkerService({ workers, supportRequests, metadata }: Dependencies) {
  return {
    async search(request: SearchWorkersRequest, now = new Date()): Promise<SearchWorkersResponse> {
      // Decode first: a malformed cursor is the cheapest thing to reject.
      const cursor = request.cursor === null ? null : decodeCursor(request.cursor, request.sort);

      // The support request is the source of truth for time and location. The client never
      // sends them, so it cannot widen the search window or move the session.
      const supportRequest = await supportRequests.findById(request.supportRequestId);
      if (!supportRequest) throw notFound('support session');

      const [services, languages] = await Promise.all([
        metadata.listServices(),
        metadata.listLanguages(),
      ]);
      const fieldErrors: Record<string, string> = {};
      const unknownServices = request.requiredServiceIds.filter(
        (slug) => !services.some((service) => service.id === slug),
      );
      if (unknownServices.length > 0) {
        fieldErrors['requiredServiceIds'] = `Unknown service: ${unknownServices.join(', ')}`;
      }
      const unknownLanguages = request.languageCodes.filter(
        (code) => !languages.some((language) => language.code === code),
      );
      if (unknownLanguages.length > 0) {
        fieldErrors['languageCodes'] = `Unknown language: ${unknownLanguages.join(', ')}`;
      }
      if (Object.keys(fieldErrors).length > 0) {
        throw validationError('Please check the highlighted fields.', fieldErrors);
      }

      const page = await workers.search({
        supportRequestId: supportRequest.id,
        radiusKm: request.radiusKm,
        requiredServiceSlugs: request.requiredServiceIds,
        languageCodes: request.languageCodes,
        requireTransport: request.hasTransport === true,
        maxHourlyRateCents: request.maxHourlyRateCents ?? null,
        sort: request.sort,
        cursor,
        limit: request.limit,
      });

      const last = page.rows.at(-1);
      return {
        items: page.rows.map((row) => row.worker),
        nextCursor:
          page.hasMore && last
            ? encodeCursor({ sort: request.sort, keys: last.sortKeys, id: last.worker.id })
            : null,
        meta: { resultCount: page.total, generatedAt: now.toISOString() },
      };
    },

    async getProfile(workerId: string, supportRequestId: string | null): Promise<WorkerProfile> {
      const profile = await workers.findProfile(workerId, supportRequestId);
      if (!profile) throw notFound('support worker');
      if (supportRequestId !== null && profile.match === null) throw notFound('support session');
      return profile;
    },
  };
}

export type WorkerService = ReturnType<typeof createWorkerService>;
