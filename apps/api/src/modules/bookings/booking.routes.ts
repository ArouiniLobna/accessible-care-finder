import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import {
  BookingParamsSchema,
  BookingResponseSchema,
  CreateBookingRequestSchema,
  IdempotencyHeadersSchema,
} from '@acf/contracts';
import { errorResponses } from '../../plugins/error-handler';
import type { BookingService } from './booking.service';

export const bookingRoutes: FastifyPluginAsyncTypebox<{ bookings: BookingService }> = async (
  app,
  { bookings },
) => {
  app.post(
    '/replacement-bookings',
    {
      schema: {
        tags: ['bookings'],
        summary: 'Confirm a replacement support worker',
        description: [
          'Validated inside one database transaction with optimistic concurrency on the availability slot.',
          '',
          '- **201** booking created.',
          '- **200** an earlier request with the same `Idempotency-Key` already created this booking; the original is returned (`idempotent-replayed: true`).',
          '- **409 WORKER_NO_LONGER_AVAILABLE** the slot changed since the customer saw it (stale `availabilityVersion`).',
          '- **409 BOOKING_CONFLICT** this session already has a replacement.',
          '- **422 IDEMPOTENCY_KEY_REUSED** the key was used for a different booking.',
        ].join('\n'),
        headers: IdempotencyHeadersSchema,
        body: CreateBookingRequestSchema,
        response: {
          200: BookingResponseSchema,
          201: BookingResponseSchema,
          ...errorResponses(400, 404, 409, 422, 500),
        },
      },
    },
    async (request, reply) => {
      const { booking, replayed } = await bookings.create(
        request.body,
        request.headers['idempotency-key'],
      );
      reply.header('idempotent-replayed', String(replayed));
      return reply.status(replayed ? 200 : 201).send(booking);
    },
  );

  app.get(
    '/bookings/:id',
    {
      schema: {
        tags: ['bookings'],
        summary: 'A confirmed booking',
        params: BookingParamsSchema,
        response: { 200: BookingResponseSchema, ...errorResponses(400, 404, 500) },
      },
    },
    async (request) => bookings.get(request.params.id),
  );
};
