import { Type, type Static } from '@sinclair/typebox';
import { LanguageSchema, ServiceSchema } from './common';

export const ServicesResponseSchema = Type.Object(
  { items: Type.Array(ServiceSchema) },
  { title: 'ServicesResponse', additionalProperties: false },
);
export type ServicesResponse = Static<typeof ServicesResponseSchema>;

export const LanguagesResponseSchema = Type.Object(
  { items: Type.Array(LanguageSchema) },
  { title: 'LanguagesResponse', additionalProperties: false },
);
export type LanguagesResponse = Static<typeof LanguagesResponseSchema>;

export const HealthResponseSchema = Type.Object(
  {
    status: Type.Union([Type.Literal('ok'), Type.Literal('degraded')]),
    database: Type.Union([Type.Literal('ok'), Type.Literal('unavailable')]),
  },
  { title: 'HealthResponse', additionalProperties: false },
);
export type HealthResponse = Static<typeof HealthResponseSchema>;
