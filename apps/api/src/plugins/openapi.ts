import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';

/**
 * OpenAPI is generated from the same TypeBox schemas used for validation and serialization,
 * so the docs cannot drift from the behaviour. Interactive UI at /docs (not in production).
 */
export async function registerOpenApi(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Accessible Care Finder API',
        version: '0.1.0',
        description:
          'Independent portfolio project using fictional data. Not affiliated with, endorsed by, or connected to Mable or Attain Healthtech.',
      },
      tags: [
        { name: 'workers' },
        { name: 'support-requests' },
        { name: 'metadata' },
        { name: 'health' },
      ],
    },
  });
  // staticCSP gives the docs UI its own CSP; the API's JSON responses keep `default-src 'none'`.
  await app.register(swaggerUi, { routePrefix: '/docs', staticCSP: true });
}
