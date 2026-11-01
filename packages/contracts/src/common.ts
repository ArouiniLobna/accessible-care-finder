import { Type, type Static } from '@sinclair/typebox';
import { API_ERROR_CODES, AVAILABILITY_STATUSES } from './constants';

/** ISO 8601 instant, e.g. 2026-11-06T23:00:00.000Z. */
export const IsoDateTime = Type.String({ format: 'date-time' });

export const EntityId = Type.String({
  minLength: 1,
  maxLength: 64,
  pattern: '^[a-z0-9_-]+$',
  description: 'Opaque, URL-safe identifier.',
});
export const AvailabilityStatusSchema = Type.Union(
  AVAILABILITY_STATUSES.map((status) => Type.Literal(status)),
  { title: 'AvailabilityStatus' },
);
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const ServiceSchema = Type.Object(
  {
    id: Type.String({ description: 'Stable slug, e.g. personal-care.' }),
    name: Type.String(),
  },
  { title: 'Service', additionalProperties: false },
);
export type Service = Static<typeof ServiceSchema>;

export const LanguageSchema = Type.Object(
  {
    code: Type.String({ description: 'ISO 639-1 code.' }),
    name: Type.String(),
  },
  { title: 'Language', additionalProperties: false },
);
export type Language = Static<typeof LanguageSchema>;

export const ApiErrorCodeSchema = Type.Union(
  API_ERROR_CODES.map((code) => Type.Literal(code)),
  { title: 'ApiErrorCode' },
);
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const ApiErrorSchema = Type.Object(
  {
    code: ApiErrorCodeSchema,
    message: Type.String({ description: 'Plain-language message safe to show to a person.' }),
    requestId: Type.String(),
    fieldErrors: Type.Optional(
      Type.Record(Type.String(), Type.String(), {
        description: 'Field path → problem description (validation errors only).',
      }),
    ),
  },
  { title: 'ApiError', additionalProperties: false },
);
export type ApiError = Static<typeof ApiErrorSchema>;
