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

Shop name: **Vibe Bánh** (2026-09-17). Brand vibe: **ấm áp, vui nhộn**.
Operating model: **pre-order, made at home**; pickup or delivery, customer picks
date and time slot.

## Design (approved 2026-09-17)

Direction **C "Hộp quà pastel"** — the canvas in `design/mockups` (page
"Hướng C — luồng đặt bánh") is the reference for every screen: home, menu,
cake detail, cart + checkout, payment, tracking. Rebuild it with the
design-wireframe skill; published at
https://claude.ai/artifact/HRrn3z3rmEdQ2UZJzHzX83.

- Tokens live in `src/app/globals.css`: bg `#FFF8FB`, surface white, ink
  `#3A2E39`, muted `#857684`, berry `#B23A6B` (actions), pink `#F6C1D4`,
  blush `#FDE3EC`, sky `#CFE8F3`, lemon `#FFF0B3`, lilac `#E4DAF5`.
  One light theme on purpose.
- Fonts: Quicksand (headings, `font-display`), Nunito (body). Big radii
  (14–24px), soft shadow `--shadow-soft`, no borders.
- **No emoji as icons.** Use `StampIcon` (`src/components/stamp-icon.tsx`):
  hand-drawn "tem in lệch" set — ink line + offset print colour. New icons
  follow the same 32 grid and style (paths for the full set are in
  `design/mockups/CIcons.dc.html`).
- Copy talks about occasions and people ("Hôm nay tặng ai?"), not SKUs.

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
- **orders** — human `code` ("VB123456", also the transfer memo), unguessable
  `track_token` for the no-login pages, status + payment status, pickup/delivery,
  gift fields (`recipient_*`, `gift_note`, `hide_price`), stored totals,
  `deposit_vnd`, `paid_vnd` (cache of the ledger), `payment_due_at`,
  `attribution` (UTM).
- **payments** — the ledger: one row per bank transaction, unique on
  `(provider, provider_ref)`. `order_id` null = transfer matched no order.
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

- **Payments:** SePay (chosen 2026-09-17 over payOS) — see "Payments" below.
  MoMo/ZaloPay later.
- **Delivery:** Ahamove / Lalamove APIs, GrabExpress.
- **Messaging:** Zalo OA + ZNS (~200–800đ per delivered message). Customers
  expect to chat before buying — offer "Đặt qua Zalo".
- **Social:** Facebook dominates social commerce; TikTok Shop VN restricts fresh
  bakery goods, so TikTok is content that links to the site.
- **Legal:** Law 91/2025 on personal data (in force 2026-01-01): explicit,
  provable consent. Household food businesses usually sign a food-safety
  commitment (Decree 15/2018) — owner to confirm with a lawyer.

## Payments (SePay)

SePay watches the shop's bank account and reports every incoming transfer. It
is not a gateway: money goes straight to the account, SePay only tells us.

Flow: `createOrder` (src/server/orders) → `/don/[trackToken]/thanh-toan` shows
a VietQR (`qr.sepay.vn/img`, memo = order code) and a 15-minute hold → customer
pays → SePay POSTs `/api/sepay/webhook` → `recordTransaction` → the page,
polling `/api/don/[token]/payment` every 3 s, flips to "đã nhận".

Rules, all in `src/server/payments`:

- **Webhook auth is HMAC-SHA256**: `X-SePay-Signature: sha256=hex(HMAC(secret,
  "{X-SePay-Timestamp}.{raw body}"))`. Verify on the raw text, never on
  re-serialised JSON. No freshness window (SePay retries for 5 h; replays are
  harmless because of the next rule).
- **Dedupe in the database**: unique `(provider, provider_ref)` + insert
  `ON CONFLICT DO NOTHING`; also skip a same-amount row with the same bank
  reference. The order row is locked `FOR UPDATE` while `paid_vnd` is
  recomputed from `SUM(payments)`.
- **Status is derived** (`status.ts`): unpaid → underpaid (less than deposit)
  → deposit_paid → paid. Reaching deposit_paid/paid moves a `pending` order to
  `confirmed` and writes an `order_events` line. `refunded` is set by hand
  and sticks.
- **Deposit rule**: 50% of each custom-cake line (rounded up to 1.000đ) + ready-
  made goods in full + delivery fee. The rest is paid on receipt.
- **Respond `200 {"success": true}`** to every correctly signed request —
  duplicates and unmatched transfers too — or SePay retries 7 times. Only a bad
  signature (401) or a crash (500) is not success.
- **Reconcile** (`reconcileSepay`, `POST /api/payments/reconcile` with
  `Bearer CRON_SECRET`, or `pnpm payments:reconcile`) re-reads SePay API v2
  transactions and records anything the webhook missed. Schedule it with
  pg_cron like the cookbook's reminders. **Not yet run against a real account**:
  on the first run, check that transactions already received by webhook come
  back as `duplicate` (webhook id and API id must be the same SePay id).
- Memo matching: SePay's extracted `code` first, then `/VB[\s.-]?\d{6}/i` in
  the content — banks rewrite memos. In SePay set the payment code structure to
  prefix `VB` + 6 digits.
- Late money is still recorded and confirms the order; an expired unpaid hold
  only changes what the page says. Releasing slots is not built yet.

Testing without a bank: `pnpm payments:demo-order` (phone 0900000000) then
`pnpm payments:simulate VB123456 385000 [--id n] [--bad-signature]`;
`pnpm check:payments` covers the pure rules. Delete test rows afterwards —
this is the production database.

Script runner note: `pnpm exec tsx` hung once in a non-interactive shell;
`node node_modules/tsx/dist/cli.mjs --env-file=.env.local <script>` works.

## Build order

1. ✅ Repo, schema, migrations.
2. ✅ Brand (name, palette, type) → home page + ordering flow **mockup, approved by
   the owner before coding**.
3. Menu + product page + custom options.
4. Checkout (no account, phone first). ✅ SePay payment page, webhook, ledger,
   reconcile (tested with simulated webhooks; real account not connected yet).
5. Admin: orders by bake day, status buttons that write `order_events`, photo
   upload, customer notes. Owner signs in with Supabase Auth.
6. Tracking page (`/don/[trackToken]`) + QR thank-you page.
7. Occasions at checkout + daily reminder job (Zalo ZNS).
8. UTM capture, analytics, consent log review.

## Deferred — do not build yet

Drops/limited batches table, loyalty, subscriptions, referral, discount codes,
delivery API booking, Zalo Mini App, MoMo/ZaloPay, SEO district pages, B2B
gifting, multi-language, an MCP server for orders/marketing.
