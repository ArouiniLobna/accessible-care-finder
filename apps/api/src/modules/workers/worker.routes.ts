import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  SearchWorkersRequestSchema,
  SearchWorkersResponseSchema,
  WorkerParamsSchema,
  WorkerProfileQuerySchema,
  WorkerProfileSchema,
} from '@acf/contracts';
import { errorResponses } from '../../plugins/error-handler';
import type { WorkerService } from './worker.service';

export const workerRoutes: FastifyPluginAsyncTypebox<{ workers: WorkerService }> = async (
  app,
  { workers },
) => {
  // POST because the criteria are structured (arrays, optional numbers, an opaque cursor).
  // It is still a safe, idempotent read: nothing is created.
  app.post(
    '/search',
    {
      schema: {
        tags: ['workers'],
        summary: 'Search support workers who can cover a cancelled session',
        description:
          'Time and location come from the support request. Only workers with an AVAILABLE slot covering the whole session are returned. Keyset (cursor) pagination; pass `nextCursor` back unchanged.',
        body: SearchWorkersRequestSchema,
        response: { 200: SearchWorkersResponseSchema, ...errorResponses(400, 404, 500) },
      },
    },
    async (request) => {
      const response = await workers.search(request.body);
      request.log.info(
        {
          supportRequestId: request.body.supportRequestId,
          sort: request.body.sort,
          resultCount: response.meta.resultCount,
          returned: response.items.length,
        },
        'worker search',
      );
      return response;
    },
  );

  app.get(
    '/:id',
    {
      schema: {
        tags: ['workers'],
        summary: 'Support worker profile',
        params: WorkerParamsSchema,
        querystring: WorkerProfileQuerySchema,
        response: { 200: WorkerProfileSchema, ...errorResponses(400, 404, 500) },
      },
    },
    async (request) =>
      workers.getProfile(request.params.id, request.query.supportRequestId ?? null),
  );
};
