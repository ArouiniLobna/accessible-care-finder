import fp from 'fastify-plugin';
import type {
  FastifyPluginAsyncTypebox,
  TypeBoxTypeProvider,
} from '@fastify/type-provider-typebox';
import {
  DemoAvailabilityResponseSchema,
  DemoFaultsRequestSchema,
  DemoSetAvailabilityRequestSchema,
  DemoSlotChangeSchema,
  DemoSlotParamsSchema,
} from '@acf/contracts';
import { Type } from '@sinclair/typebox';
import type { Database } from '../../db/client';
import { DEMO_SUPPORT_REQUEST_ID, FEATURED_WORKER_IDS, resetDemoData } from '../../db/seed';
import { notFound } from '../../shared/errors';
import { errorResponses } from '../../plugins/error-handler';
import { createAvailabilityRepository } from '../availability/availability.repository';
import type { AvailabilityNotifier } from '../availability/availability.service';

/**
 * DEMO ONLY — registered only when ENABLE_DEMO_CONTROLS=true.
 * Lets a presenter (or an E2E test) act as "another customer" and inject faults. A real
 * deployment would never expose unauthenticated endpoints that mutate availability.
 */
interface DemoOptions {
  db: Database;
  notifier: AvailabilityNotifier;
}

const SEARCH_ROUTE = '/api/workers/search';

const demoRoutes: FastifyPluginAsyncTypebox<DemoOptions> = async (app, { db, notifier }) => {
  const availability = createAvailabilityRepository(db);
  const faults = { searchFailure: false };

  // Fault injection lives here, not in production code paths: a root-level hook (this plugin
  // is wrapped with fastify-plugin) that fails search requests while the switch is on.
  app.addHook('preHandler', async (request) => {
    if (faults.searchFailure && request.routeOptions.url === SEARCH_ROUTE) {
      throw new Error('Simulated search failure (demo fault injection)');
    }
  });

  app.register(
    async (instance) => {
      // A nested plugin's instance doesn't inherit the type provider, so re-apply it.
      const demo = instance.withTypeProvider<TypeBoxTypeProvider>();
      demo.get(
        '/availability',
        {
          schema: {
            tags: ['demo'],
            summary: '[Demo only] Availability slots on the demo session day',
            response: { 200: DemoAvailabilityResponseSchema, ...errorResponses(500) },
          },
        },
        async () => ({
          supportRequestId: DEMO_SUPPORT_REQUEST_ID,
          slots: await availability.listSlotsForSessionDay(
            DEMO_SUPPORT_REQUEST_ID,
            Object.values(FEATURED_WORKER_IDS),
          ),
          faults: { ...faults },
        }),
      );

      demo.post(
        '/availability/:slotId',
        {
          schema: {
            tags: ['demo'],
            summary: '[Demo only] Change a slot as another customer or the worker would',
            description:
              'Increments the slot version. With broadcast (default) an `availability.changed` SSE event is emitted after the update commits.',
            params: DemoSlotParamsSchema,
            body: DemoSetAvailabilityRequestSchema,
            response: { 200: DemoSlotChangeSchema, ...errorResponses(400, 404, 500) },
          },
        },
        async (request) => {
          const change = await availability.setStatus(request.params.slotId, request.body.status);
          if (!change) throw notFound('availability slot');
          if (request.body.broadcast !== false) notifier.announce(change);
          request.log.info(
            {
              slotId: change.slotId,
              workerId: change.workerId,
              status: change.status,
              version: change.version,
              broadcast: request.body.broadcast !== false,
            },
            'demo availability change',
          );
          return { ...change, updatedAt: change.updatedAt.toISOString() };
        },
      );

      demo.post(
        '/reset',
        {
          schema: {
            tags: ['demo'],
            summary: '[Demo only] Restore the seeded scenario (destructive)',
            response: { 204: Type.Null(), ...errorResponses(500) },
          },
        },
        async (request, reply) => {
          await resetDemoData(db);
          faults.searchFailure = false;
          notifier.requestResync('demo-reset');
          request.log.info('demo data reset');
          return reply.status(204).send(null);
        },
      );

      demo.put(
        '/faults',
        {
          schema: {
            tags: ['demo'],
            summary: '[Demo only] Toggle simulated failures',
            body: DemoFaultsRequestSchema,
            response: { 200: DemoFaultsRequestSchema, ...errorResponses(400, 500) },
          },
        },
        async (request) => {
          faults.searchFailure = request.body.searchFailure;
          return { ...faults };
        },
      );
    },
    { prefix: '/api/demo' },
  );
};

export default fp(demoRoutes, { name: 'demo-controls' });
