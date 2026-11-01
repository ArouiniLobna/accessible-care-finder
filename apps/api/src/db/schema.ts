/**
 * Drizzle table definitions. Internal to the API: the web app never imports these.
 * Transport shapes live in @acf/contracts and are mapped in each module's repository.
 *
 * The overlap exclusion constraint on availability_slots is added by a custom migration,
 * because Drizzle's schema DSL cannot express it.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  char,
  check,
  doublePrecision,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { AVAILABILITY_STATUSES, SUPPORT_REQUEST_STATUSES } from '@acf/contracts/constants';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const availabilityStatus = pgEnum('availability_status', AVAILABILITY_STATUSES);
export const supportRequestStatus = pgEnum('support_request_status', SUPPORT_REQUEST_STATUSES);

export const workers = pgTable(
  'workers',
  {
    id: text('id').primaryKey(),
    firstName: text('first_name').notNull(),
    lastInitial: char('last_initial', { length: 1 }).notNull(),
    bio: text('bio').notNull(),
    // Money is always integer cents; never floating-point dollars.
    hourlyRateCents: integer('hourly_rate_cents').notNull(),
    rating: numeric('rating', { precision: 2, scale: 1 }).notNull(),
    reviewCount: integer('review_count').notNull().default(0),
    suburb: text('suburb').notNull(),
    postcode: char('postcode', { length: 4 }).notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    verified: boolean('verified').notNull().default(false),
    hasTransport: boolean('has_transport').notNull().default(false),
    yearsExperience: integer('years_experience').notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index('workers_postcode_idx').on(t.postcode),
    check('workers_rate_positive', sql`${t.hourlyRateCents} > 0`),
    check('workers_rating_range', sql`${t.rating} >= 0 AND ${t.rating} <= 5`),
    check('workers_review_count_non_negative', sql`${t.reviewCount} >= 0`),
    check('workers_experience_non_negative', sql`${t.yearsExperience} >= 0`),
    check('workers_latitude_range', sql`${t.latitude} BETWEEN -90 AND 90`),
    check('workers_longitude_range', sql`${t.longitude} BETWEEN -180 AND 180`),
  ],
);

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
});

export const languages = pgTable('languages', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
});

export const workerServices = pgTable(
  'worker_services',
  {
    workerId: text('worker_id')
      .notNull()
      .references(() => workers.id, { onDelete: 'cascade' }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
  },
  (t) => [
    primaryKey({ name: 'worker_services_pk', columns: [t.workerId, t.serviceId] }),
    index('worker_services_service_worker_idx').on(t.serviceId, t.workerId),
  ],
);

export const workerLanguages = pgTable(
  'worker_languages',
  {
    workerId: text('worker_id')
      .notNull()
      .references(() => workers.id, { onDelete: 'cascade' }),
    languageId: integer('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'restrict' }),
  },
  (t) => [
    primaryKey({ name: 'worker_languages_pk', columns: [t.workerId, t.languageId] }),
    index('worker_languages_language_worker_idx').on(t.languageId, t.workerId),
  ],
);

export const availabilitySlots = pgTable(
  'availability_slots',
  {
    id: text('id').primaryKey(),
    workerId: text('worker_id')
      .notNull()
      .references(() => workers.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    status: availabilityStatus('status').notNull().default('AVAILABLE'),
    // Optimistic-concurrency token: every status change increments it (Step 8).
    version: integer('version').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('availability_slots_worker_status_range_idx').on(
      t.workerId,
      t.status,
      t.startsAt,
      t.endsAt,
    ),
    check('availability_slots_valid_range', sql`${t.endsAt} > ${t.startsAt}`),
    check('availability_slots_version_positive', sql`${t.version} >= 1`),
  ],
);

export const supportRequests = pgTable(
  'support_requests',
  {
    id: text('id').primaryKey(),
    status: supportRequestStatus('status').notNull(),
    timezone: text('timezone').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    suburb: text('suburb').notNull(),
    postcode: char('postcode', { length: 4 }).notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    ...timestamps,
  },
  (t) => [check('support_requests_valid_range', sql`${t.endsAt} > ${t.startsAt}`)],
);

export const supportRequestServices = pgTable(
  'support_request_services',
  {
    supportRequestId: text('support_request_id')
      .notNull()
      .references(() => supportRequests.id, { onDelete: 'cascade' }),
    serviceId: integer('service_id')
      .notNull()
      .references(() => services.id, { onDelete: 'restrict' }),
  },
  (t) => [
    primaryKey({ name: 'support_request_services_pk', columns: [t.supportRequestId, t.serviceId] }),
  ],
);
