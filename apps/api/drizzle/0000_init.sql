CREATE TYPE "public"."availability_status" AS ENUM('AVAILABLE', 'TENTATIVE', 'BOOKED', 'UNAVAILABLE');--> statement-breakpoint
CREATE TYPE "public"."support_request_status" AS ENUM('CANCELLED_NEEDS_REPLACEMENT', 'REPLACEMENT_BOOKED');--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"worker_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "availability_status" DEFAULT 'AVAILABLE' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_slots_valid_range" CHECK ("availability_slots"."ends_at" > "availability_slots"."starts_at"),
	CONSTRAINT "availability_slots_version_positive" CHECK ("availability_slots"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "languages_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "support_request_services" (
	"support_request_id" text NOT NULL,
	"service_id" integer NOT NULL,
	CONSTRAINT "support_request_services_pk" PRIMARY KEY("support_request_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "support_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"status" "support_request_status" NOT NULL,
	"timezone" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"suburb" text NOT NULL,
	"postcode" char(4) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_requests_valid_range" CHECK ("support_requests"."ends_at" > "support_requests"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "worker_languages" (
	"worker_id" text NOT NULL,
	"language_id" integer NOT NULL,
	CONSTRAINT "worker_languages_pk" PRIMARY KEY("worker_id","language_id")
);
--> statement-breakpoint
CREATE TABLE "worker_services" (
	"worker_id" text NOT NULL,
	"service_id" integer NOT NULL,
	CONSTRAINT "worker_services_pk" PRIMARY KEY("worker_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "workers" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_initial" char(1) NOT NULL,
	"bio" text NOT NULL,
	"hourly_rate_cents" integer NOT NULL,
	"rating" numeric(2, 1) NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"suburb" text NOT NULL,
	"postcode" char(4) NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"has_transport" boolean DEFAULT false NOT NULL,
	"years_experience" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workers_rate_positive" CHECK ("workers"."hourly_rate_cents" > 0),
	CONSTRAINT "workers_rating_range" CHECK ("workers"."rating" >= 0 AND "workers"."rating" <= 5),
	CONSTRAINT "workers_review_count_non_negative" CHECK ("workers"."review_count" >= 0),
	CONSTRAINT "workers_experience_non_negative" CHECK ("workers"."years_experience" >= 0),
	CONSTRAINT "workers_latitude_range" CHECK ("workers"."latitude" BETWEEN -90 AND 90),
	CONSTRAINT "workers_longitude_range" CHECK ("workers"."longitude" BETWEEN -180 AND 180)
);
--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_request_services" ADD CONSTRAINT "support_request_services_support_request_id_support_requests_id_fk" FOREIGN KEY ("support_request_id") REFERENCES "public"."support_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_request_services" ADD CONSTRAINT "support_request_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_languages" ADD CONSTRAINT "worker_languages_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_languages" ADD CONSTRAINT "worker_languages_language_id_languages_id_fk" FOREIGN KEY ("language_id") REFERENCES "public"."languages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_services" ADD CONSTRAINT "worker_services_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_services" ADD CONSTRAINT "worker_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "availability_slots_worker_status_range_idx" ON "availability_slots" USING btree ("worker_id","status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "worker_languages_language_worker_idx" ON "worker_languages" USING btree ("language_id","worker_id");--> statement-breakpoint
CREATE INDEX "worker_services_service_worker_idx" ON "worker_services" USING btree ("service_id","worker_id");--> statement-breakpoint
CREATE INDEX "workers_postcode_idx" ON "workers" USING btree ("postcode");