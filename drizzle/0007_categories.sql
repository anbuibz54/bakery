CREATE TABLE "bakery"."categories" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"chip" text NOT NULL,
	"note" text,
	"icon" text DEFAULT 'cake' NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "bakery"."categories" ("slug", "title", "chip", "note", "icon", "position") VALUES
  ('banh-kem', 'Bánh kem sinh nhật', 'Bánh kem', 'Đặt trước 2 ngày · cọc 50% · viết chữ miễn phí', 'cake', 0),
  ('pastry', 'Pastry & ngàn lớp', 'Pastry', 'Nướng theo mẻ, đặt trước 1 ngày', 'croissant', 1),
  ('banh-viet', 'Bánh Việt, fusion', 'Bánh Việt', 'Đặt trước 1 ngày', 'bowl', 2),
  ('trung-thu', 'Hộp quà Trung thu', 'Trung thu', 'Nhận đặt đến 25/9 · đặt trước 3 ngày', 'lantern', 3)
ON CONFLICT ("slug") DO NOTHING;
