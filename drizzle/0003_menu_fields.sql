ALTER TABLE "bakery"."product_options" ADD COLUMN "detail" text;--> statement-breakpoint
ALTER TABLE "bakery"."products" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "bakery"."products" ADD COLUMN "takes_deposit" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bakery"."products" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bakery"."products" ADD COLUMN "sold_out_note" text;--> statement-breakpoint
ALTER TABLE "bakery"."products" ADD COLUMN "tone" text DEFAULT '#FDE3EC' NOT NULL;--> statement-breakpoint
ALTER TABLE "bakery"."products" ADD COLUMN "photo_key" text;