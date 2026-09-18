CREATE TABLE "bakery"."benchmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric" text NOT NULL,
	"label" text NOT NULL,
	"low_value" real,
	"high_value" real,
	"source" text,
	"note" text,
	"checked_on" date
);
--> statement-breakpoint
CREATE TABLE "bakery"."competitor_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_name" text NOT NULL,
	"category" text NOT NULL,
	"product_label" text NOT NULL,
	"size_label" text,
	"price_vnd" integer NOT NULL,
	"url" text,
	"checked_on" date NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "bakery"."ingredient_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"supplier_id" uuid,
	"pack_label" text,
	"pack_quantity" real NOT NULL,
	"price_vnd" integer NOT NULL,
	"bought_on" date NOT NULL,
	"source" text DEFAULT 'hand' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bakery"."ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"match_key" text NOT NULL,
	"food_id" uuid,
	"unit" text DEFAULT 'g' NOT NULL,
	"is_packaging" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bakery"."product_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"option_id" uuid,
	"label" text,
	"recipe_id" uuid,
	"multiplier" real DEFAULT 1 NOT NULL,
	"ingredient_id" uuid,
	"quantity" real,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bakery"."shop_settings" (
	"id" text PRIMARY KEY DEFAULT 'shop' NOT NULL,
	"labour_per_hour_vnd" integer DEFAULT 40000 NOT NULL,
	"electricity_per_kwh_vnd" integer DEFAULT 3000 NOT NULL,
	"oven_kw" real DEFAULT 2 NOT NULL,
	"payment_plan_monthly_vnd" integer DEFAULT 0 NOT NULL,
	"delivery_subsidy_vnd" integer DEFAULT 0 NOT NULL,
	"target_ingredient_pct" real DEFAULT 0.35 NOT NULL,
	"target_margin_pct" real DEFAULT 0.35 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bakery"."suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bakery"."order_items" ADD COLUMN "unit_cost_vnd" integer;--> statement-breakpoint
ALTER TABLE "bakery"."orders" ADD COLUMN "channel" text DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "bakery"."products" ADD COLUMN "labour_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bakery"."products" ADD COLUMN "oven_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bakery"."ingredient_prices" ADD CONSTRAINT "ingredient_prices_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "bakery"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bakery"."ingredient_prices" ADD CONSTRAINT "ingredient_prices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "bakery"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bakery"."product_components" ADD CONSTRAINT "product_components_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "bakery"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bakery"."product_components" ADD CONSTRAINT "product_components_option_id_product_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "bakery"."product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bakery"."product_components" ADD CONSTRAINT "product_components_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "bakery"."ingredients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "benchmarks_metric_idx" ON "bakery"."benchmarks" USING btree ("metric");--> statement-breakpoint
CREATE INDEX "competitor_prices_category_idx" ON "bakery"."competitor_prices" USING btree ("category","checked_on");--> statement-breakpoint
CREATE INDEX "ingredient_prices_latest_idx" ON "bakery"."ingredient_prices" USING btree ("ingredient_id","bought_on");--> statement-breakpoint
CREATE INDEX "ingredient_prices_supplier_idx" ON "bakery"."ingredient_prices" USING btree ("supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_match_key_idx" ON "bakery"."ingredients" USING btree ("match_key");--> statement-breakpoint
CREATE INDEX "ingredients_food_idx" ON "bakery"."ingredients" USING btree ("food_id");--> statement-breakpoint
CREATE INDEX "product_components_product_idx" ON "bakery"."product_components" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "product_components_option_idx" ON "bakery"."product_components" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "product_components_ingredient_idx" ON "bakery"."product_components" USING btree ("ingredient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_name_idx" ON "bakery"."suppliers" USING btree ("name");