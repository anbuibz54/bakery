# Bakery

Context file for Claude Code. Framework rules live in `AGENTS.md` — this is
Next.js 16, which differs from older versions in ways that matter.

@AGENTS.md

## What this is

The ordering website for a new home/artisan bakery in **Vietnam**, owned by a
developer ("dev sợ AI giành việc nên quay về làm bánh"). Sells birthday/cream
cakes, pastries, Vietnamese/fusion cakes, seasonal gift boxes.

The goal is not a menu + cart. Local competitors (Savor, Bakes Saigon) win on
speed and convenience; almost nobody competes on **feeling**. The site must make
a customer remember the shop and come back — and later be the hub for marketing
and sales.

Brand vibe: **ấm áp, vui nhộn**. Shop name: **not decided** (candidates so far
rejected by the owner; "HeHe Bake Shop" already exists in Saigon, so "Hehe"
alone is out as a name). Operating model (home pre-order vs. a shop): **not
decided** — keep both pickup and delivery, and slot-based scheduling, possible.

All copy is Vietnamese.

Sister repo: `../cookbook`. Products link to its recipes (`products.recipe_id`)
for nutrition labels / allergens, cost per cake, and bake-day production lists.

## Stack

Same as LifeOS (`C:\D\LifeOS`) and the cookbook — read LifeOS's CLAUDE.md for the
reasoning; the rules carry over:

- Next.js (App Router) + TypeScript, Vercel. Supabase Postgres via Drizzle.
- All data access through `src/server/`. **Nothing in `src/server/` imports
  `next/*`.**
- Session pooler (5432), never 6543. Pool `max: 3`.
- Every foreign key gets an index. Migrations only go forward.
- Money is integer VND.

### Shared database — read before touching migrations

Lives in the **LifeOS Supabase project**: LifeOS owns `public`, the cookbook owns
`cookbook`, this app owns `bakery`.

- Declare everything via `bakery.table(...)` / `bakery.enum(...)`.
- `drizzle.config.ts`: `schemaFilter: ['bakery']`, journal in
  `bakery.__drizzle_migrations`. Do not remove either.
- drizzle-kit creates the schema before migration 0000 runs, so a generated
  `CREATE SCHEMA "bakery"` must be `IF NOT EXISTS` (0000 was patched).
- Read generated SQL before `pnpm db:migrate`: it must not mention `public` or
  `cookbook`.
- No staging database; this is next to the owner's personal data. Customer data
  here falls under Law 91/2025 — when the shop grows, move `bakery` to its own
  project (`pg_dump -n bakery`).
- **Customers are not Supabase Auth users.** They are rows in
  `bakery.customers`, keyed by phone. `auth.users` is the owner's accounts only
  (admin sign-in, when it is built).

## Schema (`src/server/db/schema.ts`)

- **products** / **product_options** — menu and custom-cake-builder choices
  (group + label + price delta). `recipe_id` is a soft reference to
  `cookbook.recipes`, no FK on purpose (independent deploys).
- **customers** — phone-keyed, `notes` for allergies, `marketing_consent_at`
  (null = transactional messages only).
- **occasions** — "nhắc sinh nhật mẹ": month/day, `remind_days_before`,
  `consent_at` NOT NULL, `last_reminded_year` for an idempotent daily job.
- **orders** — human `code`, unguessable `track_token` for the no-login tracking
  page, status + payment status, pickup/delivery, gift fields (`recipient_*`,
  `gift_note`, `hide_price`), stored totals, `payos_order_code`, `attribution`
  (UTM).
- **order_items** — snapshots name/options/price; `cake_message`.
- **order_events** — append-only customer-facing story (status, message, photo
  of *their* cake). Written in the same transaction as `orders.status`.

## Research conclusions (2026-09-15)

Retention features that fit a one-person bakery, in priority order:

1. **Occasion reminders** — save birthdays at checkout (explicit consent), remind
   7–10 days before via Zalo. The most distinctive feature for a birthday-cake shop.
2. **Story-style order tracking** — "Cốt bánh đang nướng… đang phủ kem…" plus a
   real photo before it leaves.
3. **QR in the box** → thank-you page: note from the baker, storage tips, photo
   review upload, reorder link.
4. **Limited weekly drops / pre-order calendar** with stock counter and "báo tui
   khi mở bán".
5. **Gift mode** — handwritten-style card, hidden price, recipient details.
6. Guided custom cake builder with few options and a live price.
7. Later (after ~50–100 customers): stamp card, prepaid 3-month cake club,
   abandoned-cart / win-back flows, referral, flavour voting.

Vietnam specifics:

- **Payments:** payOS (dynamic VietQR per order, webhook confirms payment, free,
  individuals can register). Deposit for custom cakes. MoMo/ZaloPay later.
- **Delivery:** Ahamove / Lalamove APIs, GrabExpress.
- **Messaging:** Zalo OA + ZNS (~200–800đ per delivered message). Customers
  expect to chat before buying — offer "Đặt qua Zalo".
- **Social:** Facebook dominates social commerce; TikTok Shop VN restricts fresh
  bakery goods, so TikTok is content that links to the site.
- **Legal:** Law 91/2025 on personal data (in force 2026-01-01): explicit,
  provable consent. Household food businesses usually sign a food-safety
  commitment (Decree 15/2018) — owner to confirm with a lawyer.

## Build order

1. ✅ Repo, schema, migrations.
2. Brand (name, palette, type) → home page + ordering flow **mockup, approved by
   the owner before coding**.
3. Menu + product page + custom options.
4. Checkout (no account, phone first) + payOS VietQR + webhook.
5. Admin: orders by bake day, status buttons that write `order_events`, photo
   upload, customer notes. Owner signs in with Supabase Auth.
6. Tracking page (`/don/[trackToken]`) + QR thank-you page.
7. Occasions at checkout + daily reminder job (Zalo ZNS).
8. UTM capture, analytics, consent log review.

## Deferred — do not build yet

Drops/limited batches table, loyalty, subscriptions, referral, discount codes,
delivery API booking, Zalo Mini App, MoMo/ZaloPay, SEO district pages, B2B
gifting, multi-language, an MCP server for orders/marketing.
