ALTER TYPE "bakery"."payment_status" ADD VALUE 'underpaid';--> statement-breakpoint
CREATE TABLE "bakery"."payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"provider" text NOT NULL,
	"provider_ref" text NOT NULL,
	"amount_vnd" integer NOT NULL,
	"content" text,
	"bank_ref" text,
	"bank" text,
	"received_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"raw" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "bakery"."orders_payos_code_idx";--> statement-breakpoint
ALTER TABLE "bakery"."payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "bakery"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_ref_idx" ON "bakery"."payments" USING btree ("provider","provider_ref");--> statement-breakpoint
CREATE INDEX "payments_order_idx" ON "bakery"."payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "payments_unmatched_idx" ON "bakery"."payments" USING btree ("received_at") WHERE "bakery"."payments"."order_id" is null;--> statement-breakpoint
ALTER TABLE "bakery"."orders" DROP COLUMN "payos_order_code";