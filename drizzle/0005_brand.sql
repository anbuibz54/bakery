CREATE TABLE "bakery"."brand_settings" (
	"id" text PRIMARY KEY DEFAULT 'shop' NOT NULL,
	"name" text NOT NULL,
	"wordmark" text NOT NULL,
	"tagline" text,
	"logo_path" text,
	"palette" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"instagram_url" text,
	"facebook_url" text,
	"tiktok_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
