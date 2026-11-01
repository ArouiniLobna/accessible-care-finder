import { Type, type Static } from '@sinclair/typebox';
import {
  SEARCH_PAGE_SIZE_DEFAULT,
  SEARCH_PAGE_SIZE_MAX,
  SEARCH_RADII_KM,
  SEARCH_SORTS,
} from './constants';
import {
  AvailabilityStatusSchema,
  EntityId,
  IsoDateTime,
  LanguageSchema,
  ServiceSchema,
} from './common';

export const SlotAvailabilitySchema = Type.Object(
  {
    slotId: EntityId,
    status: AvailabilityStatusSchema,
    version: Type.Integer({
      minimum: 1,
      description: 'Optimistic-concurrency version. Send it back when booking.',
    }),
  },
  { title: 'SlotAvailability', additionalProperties: false },
);
export type SlotAvailability = Static<typeof SlotAvailabilitySchema>;

export const SearchSortSchema = Type.Union(
  SEARCH_SORTS.map((s) => Type.Literal(s)),
  { title: 'SearchSort', default: 'recommended' },
);
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const SearchRadiusSchema = Type.Union(
  SEARCH_RADII_KM.map((r) => Type.Literal(r)),
  { title: 'SearchRadiusKm' },
);
export type SearchRadiusKm = (typeof SEARCH_RADII_KM)[number];

export const SearchWorkersRequestSchema = Type.Object(
  {
    supportRequestId: EntityId,
    radiusKm: SearchRadiusSchema,
    requiredServiceIds: Type.Array(Type.String({ minLength: 1, maxLength: 64 }), {
      maxItems: 16,
      uniqueItems: true,
      description: 'Worker must provide every listed service.',
    }),
    languageCodes: Type.Array(Type.String({ minLength: 2, maxLength: 8 }), {
      maxItems: 16,
      uniqueItems: true,
      description: 'Worker must speak at least one listed language. Empty = no preference.',
    }),
    hasTransport: Type.Optional(
      Type.Boolean({ description: 'true = only workers with their own transport.' }),
    ),
    maxHourlyRateCents: Type.Optional(
      Type.Integer({ minimum: 1000, maximum: 100000, description: 'AUD cents.' }),
    ),
    sort: SearchSortSchema,
    cursor: Type.Union([Type.String({ minLength: 1, maxLength: 512 }), Type.Null()], {
      description: 'Opaque cursor from a previous response. null for the first page.',
    }),
    limit: Type.Integer({
      minimum: 1,
      maximum: SEARCH_PAGE_SIZE_MAX,
      default: SEARCH_PAGE_SIZE_DEFAULT,
    }),
  },
  {
    title: 'SearchWorkersRequest',
    additionalProperties: false,
    description:
      'Session time and location are never accepted from the client: the API reads them from the support request.',
  },
);
export type SearchWorkersRequest = Static<typeof SearchWorkersRequestSchema>;

export const WorkerSummarySchema = Type.Object(
  {
    id: EntityId,
    firstName: Type.String(),
    lastInitial: Type.String({ minLength: 1, maxLength: 1 }),
    verified: Type.Boolean(),
    rating: Type.Number({ minimum: 0, maximum: 5 }),
    reviewCount: Type.Integer({ minimum: 0 }),
    hourlyRateCents: Type.Integer({ minimum: 0 }),
    distanceKm: Type.Number({ minimum: 0 }),
    services: Type.Array(ServiceSchema),
    languages: Type.Array(LanguageSchema),
    hasTransport: Type.Boolean(),
    availability: SlotAvailabilitySchema,
  },
  { title: 'WorkerSummary', additionalProperties: false },
);
export type WorkerSummary = Static<typeof WorkerSummarySchema>;

export const SearchWorkersResponseSchema = Type.Object(
  {
    items: Type.Array(WorkerSummarySchema),
    nextCursor: Type.Union([Type.String(), Type.Null()]),
    meta: Type.Object(
      {
        resultCount: Type.Integer({ minimum: 0, description: 'Total matches across all pages.' }),
        generatedAt: IsoDateTime,
      },
      { additionalProperties: false },
    ),
  },
  { title: 'SearchWorkersResponse', additionalProperties: false },
);
export type SearchWorkersResponse = Static<typeof SearchWorkersResponseSchema>;

export const WorkerProfileSchema = Type.Object(
  {
    id: EntityId,
    firstName: Type.String(),
    lastInitial: Type.String(),
    bio: Type.String(),
    verified: Type.Boolean(),
    rating: Type.Number({ minimum: 0, maximum: 5 }),
    reviewCount: Type.Integer({ minimum: 0 }),
    hourlyRateCents: Type.Integer({ minimum: 0 }),
    yearsExperience: Type.Integer({ minimum: 0 }),
    suburb: Type.String(),
    hasTransport: Type.Boolean(),
    services: Type.Array(ServiceSchema),
    languages: Type.Array(LanguageSchema),
    match: Type.Union(
      [
        Type.Object(
          {
            supportRequestId: EntityId,
            distanceKm: Type.Number({ minimum: 0 }),
            availability: Type.Union([SlotAvailabilitySchema, Type.Null()], {
              description:
                'The slot covering the requested session, whatever its status; null if none.',
            }),
          },
          { additionalProperties: false },
        ),
        Type.Null(),
      ],
      { description: 'Present when supportRequestId is supplied.' },
    ),
  },
  { title: 'WorkerProfile', additionalProperties: false },
);
export type WorkerProfile = Static<typeof WorkerProfileSchema>;

export const WorkerParamsSchema = Type.Object({ id: EntityId });
export const WorkerProfileQuerySchema = Type.Object(
  { supportRequestId: Type.Optional(EntityId) },
  { additionalProperties: false },
);
