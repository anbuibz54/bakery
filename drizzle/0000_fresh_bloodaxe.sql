CREATE SCHEMA IF NOT EXISTS "bakery";
--> statement-breakpoint
CREATE TYPE "bakery"."fulfillment" AS ENUM('pickup', 'delivery');--> statement-breakpoint
CREATE TYPE "bakery"."order_status" AS ENUM('pending', 'confirmed', 'baking', 'decorating', 'ready', 'delivering', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "bakery"."payment_status" AS ENUM('unpaid', 'deposit_paid', 'paid', 'refunded');--> statement-breakpoint
CREATE TABLE "bakery"."customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"email" text,
	"zalo_user_id" text,
	"notes" text,
	"marketing_consent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bakery"."occasions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"label" text NOT NULL,
	"person_name" text,
	"month" smallint NOT NULL,
	"day" smallint NOT NULL,
	"remind_days_before" smallint DEFAULT 7 NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"last_reminded_year" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bakery"."order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"status" "bakery"."order_status",
	"message" text,
	"photo_key" text,
	"visible_to_customer" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bakery"."order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cake_message" text,
	"quantity" smallint NOT NULL,
	"unit_price_vnd" integer NOT NULL,
	"line_total_vnd" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bakery"."orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"track_token" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" "bakery"."order_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "bakery"."payment_status" DEFAULT 'unpaid' NOT NULL,
	"fulfillment" "bakery"."fulfillment" NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"delivery_address" text,
	"recipient_name" text,
	"recipient_phone" text,
	"gift_note" text,
	"hide_price" boolean DEFAULT false NOT NULL,
	"subtotal_vnd" integer NOT NULL,
	"delivery_fee_vnd" integer DEFAULT 0 NOT NULL,
	"discount_vnd" integer DEFAULT 0 NOT NULL,
	"total_vnd" integer NOT NULL,
	"deposit_vnd" integer DEFAULT 0 NOT NULL,
	"payos_order_code" bigint,
	"customer_note" text,
	"attribution" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bakery"."product_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"group" text NOT NULL,
	"label" text NOT NULL,
	"price_delta_vnd" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bakery"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"base_price_vnd" integer NOT NULL,
	"lead_time_hours" integer DEFAULT 24 NOT NULL,
	"recipe_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bakery"."occasions" ADD CONSTRAINT "occasions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "bakery"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bakery"."order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "bakery"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bakery"."order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "bakery"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bakery"."order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "bakery"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bakery"."orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "bakery"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bakery"."product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "bakery"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_phone_idx" ON "bakery"."customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "occasions_customer_idx" ON "bakery"."occasions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "occasions_date_idx" ON "bakery"."occasions" USING btree ("month","day");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "bakery"."order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "bakery"."order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "bakery"."order_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_code_idx" ON "bakery"."orders" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_track_token_idx" ON "bakery"."orders" USING btree ("track_token");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_payos_code_idx" ON "bakery"."orders" USING btree ("payos_order_code");--> statement-breakpoint
CREATE INDEX "orders_customer_idx" ON "bakery"."orders" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_scheduled_idx" ON "bakery"."orders" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "product_options_product_idx" ON "bakery"."product_options" USING btree ("product_id","group","position");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_idx" ON "bakery"."products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_menu_idx" ON "bakery"."products" USING btree ("category","position") WHERE "bakery"."products"."is_active";