import { Type, type Static } from '@sinclair/typebox';
import { EntityId, IsoDateTime, ServiceSchema } from './common';

export const CreateBookingRequestSchema = Type.Object(
  {
    supportRequestId: EntityId,
    workerId: EntityId,
    availabilitySlotId: EntityId,
    availabilityVersion: Type.Integer({
      minimum: 1,
      description: 'The slot version the customer saw. A stale version produces 409.',
    }),
  },
  { title: 'CreateBookingRequest', additionalProperties: false },
);
export type CreateBookingRequest = Static<typeof CreateBookingRequestSchema>;

export const IdempotencyHeadersSchema = Type.Object({
  'idempotency-key': Type.String({
    minLength: 16,
    maxLength: 128,
    pattern: '^[A-Za-z0-9_-]+$',
    description: 'Client-generated key, stable across retries of one confirmation attempt.',
  }),
});

export const BookingResponseSchema = Type.Object(
  {
    id: EntityId,
    status: Type.Literal('CONFIRMED'),
    supportRequestId: EntityId,
    worker: Type.Object(
      { id: EntityId, firstName: Type.String(), lastInitial: Type.String() },
      { additionalProperties: false },
    ),
    startsAt: IsoDateTime,
    endsAt: IsoDateTime,
    timezone: Type.String(),
    services: Type.Array(ServiceSchema),
    hourlyRateCents: Type.Integer({ minimum: 0 }),
    estimatedTotalCents: Type.Integer({ minimum: 0 }),
    createdAt: IsoDateTime,
  },
  { title: 'BookingResponse', additionalProperties: false },
);
export type BookingResponse = Static<typeof BookingResponseSchema>;

export const BookingParamsSchema = Type.Object({ id: EntityId });
