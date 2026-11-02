import { Type, type Static } from '@sinclair/typebox';
import { AvailabilityStatusSchema, EntityId, IsoDateTime } from './common';
import { AvailabilityChangedEventSchema } from './events';

/** Demo-only contracts. These routes exist only when ENABLE_DEMO_CONTROLS=true. */

export const DemoSlotSchema = Type.Object(
  {
    slotId: EntityId,
    workerId: EntityId,
    workerDisplayName: Type.String(),
    startsAt: IsoDateTime,
    endsAt: IsoDateTime,
    status: AvailabilityStatusSchema,
    version: Type.Integer({ minimum: 1 }),
    coversDemoSession: Type.Boolean(),
  },
  { title: 'DemoSlot', additionalProperties: false },
);
export type DemoSlot = Static<typeof DemoSlotSchema>;

export const DemoAvailabilityResponseSchema = Type.Object(
  {
    supportRequestId: EntityId,
    slots: Type.Array(DemoSlotSchema),
    faults: Type.Object({ searchFailure: Type.Boolean() }, { additionalProperties: false }),
  },
  { title: 'DemoAvailabilityResponse', additionalProperties: false },
);
export type DemoAvailabilityResponse = Static<typeof DemoAvailabilityResponseSchema>;

export const DemoSetAvailabilityRequestSchema = Type.Object(
  {
    status: AvailabilityStatusSchema,
    broadcast: Type.Optional(
      Type.Boolean({
        default: true,
        description:
          'false changes the slot without emitting an SSE event — simulating a lost event, so a stale booking attempt produces a real 409.',
      }),
    ),
  },
  { title: 'DemoSetAvailabilityRequest', additionalProperties: false },
);
export type DemoSetAvailabilityRequest = Static<typeof DemoSetAvailabilityRequestSchema>;

export const DemoFaultsRequestSchema = Type.Object(
  { searchFailure: Type.Boolean() },
  { title: 'DemoFaultsRequest', additionalProperties: false },
);
export type DemoFaultsRequest = Static<typeof DemoFaultsRequestSchema>;

export const DemoSlotParamsSchema = Type.Object({ slotId: EntityId });

export const DemoSlotChangeSchema = Type.Omit(AvailabilityChangedEventSchema, ['eventId'], {
  title: 'DemoSlotChange',
});
export type DemoSlotChange = Static<typeof DemoSlotChangeSchema>;
