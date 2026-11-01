CREATE TYPE "public"."booking_status" AS ENUM('CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"support_request_id" text NOT NULL,
	"worker_id" text NOT NULL,
	"availability_slot_id" text NOT NULL,
	"hourly_rate_cents" integer NOT NULL,
	"status" "booking_status" DEFAULT 'CONFIRMED' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_support_request_id_support_requests_id_fk" FOREIGN KEY ("support_request_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_availability_slot_id_availability_slots_id_fk" FOREIGN KEY ("availability_slot_id") REFERENCES "public"."availability_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_idempotency_key_uq" ON "bookings" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "bookings_support_request_idx" ON "bookings" USING btree ("support_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_one_confirmed_per_request_uq" ON "bookings" USING btree ("support_request_id") WHERE "bookings"."status" = 'CONFIRMED';--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_one_confirmed_per_slot_uq" ON "bookings" USING btree ("availability_slot_id") WHERE "bookings"."status" = 'CONFIRMED';