ALTER TABLE "bakery"."orders" ADD COLUMN "paid_vnd" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bakery"."orders" ADD COLUMN "payment_due_at" timestamp with time zone;