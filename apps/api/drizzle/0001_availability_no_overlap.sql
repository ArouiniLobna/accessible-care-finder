-- Custom migration: an integrity rule Drizzle's schema DSL cannot express.
-- A worker can never have two overlapping availability slots.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "availability_slots"
  ADD CONSTRAINT "availability_slots_no_overlap"
  EXCLUDE USING gist (
    "worker_id" WITH =,
    tstzrange("starts_at", "ends_at") WITH &&
  );