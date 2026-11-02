import { Type, type Static } from '@sinclair/typebox';
import { AvailabilityStatusSchema, EntityId, IsoDateTime } from './common';

/**
 * Payload of the `availability.changed` SSE event.
 * Advisory only: it makes the UI fresher, but booking is still validated server-side.
 */
export const AvailabilityChangedEventSchema = Type.Object(
  {
    eventId: Type.String(),
    workerId: EntityId,
    workerDisplayName: Type.String({ description: 'First name + last initial, e.g. "Amelia R."' }),
    slotId: EntityId,
    status: AvailabilityStatusSchema,
    version: Type.Integer({ minimum: 1 }),
    updatedAt: IsoDateTime,
  },
  { title: 'AvailabilityChangedEvent', additionalProperties: false },
);
export type AvailabilityChangedEvent = Static<typeof AvailabilityChangedEventSchema>;
