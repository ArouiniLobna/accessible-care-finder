import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { LanguagesResponseSchema, ServicesResponseSchema } from '@acf/contracts';
import { errorResponses } from '../../plugins/error-handler';
import type { MetadataRepository } from './metadata.repository';

/** Reference data changes rarely; browsers and the web app may cache it. */
const CACHE_CONTROL = 'public, max-age=300';

export const metadataRoutes: FastifyPluginAsyncTypebox<{ metadata: MetadataRepository }> = async (
  app,
  { metadata },
) => {
  app.get(
    '/services',
    {
      schema: {
        tags: ['metadata'],
        summary: 'Support services that can be requested',
        response: { 200: ServicesResponseSchema, ...errorResponses(500) },
      },
    },
    async (_request, reply) => {
      reply.header('cache-control', CACHE_CONTROL);
      return { items: await metadata.listServices() };
    },
  );

  app.get(
    '/languages',
    {
      schema: {
        tags: ['metadata'],
        summary: 'Languages support workers speak',
        response: { 200: LanguagesResponseSchema, ...errorResponses(500) },
      },
    },
    async (_request, reply) => {
      reply.header('cache-control', CACHE_CONTROL);
      return { items: await metadata.listLanguages() };
    },
  );
};
