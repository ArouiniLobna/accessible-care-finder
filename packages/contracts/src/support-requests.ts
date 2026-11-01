import { Type, type Static } from '@sinclair/typebox';
import { SUPPORT_REQUEST_STATUSES } from './constants';
import { EntityId, IsoDateTime, ServiceSchema } from './common';

export const SupportRequestSchema = Type.Object(
  {
    id: EntityId,
    status: Type.Union(SUPPORT_REQUEST_STATUSES.map((s) => Type.Literal(s))),
    timezone: Type.String({ description: 'IANA timezone of the session, e.g. Australia/Sydney.' }),
    startsAt: IsoDateTime,
    endsAt: IsoDateTime,
    location: Type.Object(
      {
        suburb: Type.String(),
        postcode: Type.String(),
      },
      {
        additionalProperties: false,
        description: 'Approximate location only. Street addresses are never exposed.',
      },
    ),
    services: Type.Array(ServiceSchema),
    replacementBookingId: Type.Union([EntityId, Type.Null()]),
  },
  { title: 'SupportRequest', additionalProperties: false },
);
export type SupportRequest = Static<typeof SupportRequestSchema>;
export type SupportRequestStatus = SupportRequest['status'];

export const SupportRequestParamsSchema = Type.Object({ id: EntityId });
