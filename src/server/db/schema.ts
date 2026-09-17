/**
 * Bakery — v0.1 schema. The ordering core only.
 *
 * Everything lives in the `bakery` Postgres schema (shared database: LifeOS in
 * `public`, cookbook in `cookbook`). Never use bare `pgTable`/`pgEnum`.
 *
 * Built around what makes customers come back (see CLAUDE.md), not just a
 * cart: orders carry a gift note and a customer-facing story of events;
 * customers carry the occasions to remind them about.
 *
 * Money is integer VND. There are no fractional đồng, and floats for money are
 * how totals stop adding up.
 *
 * Rules: every foreign key gets an index; migrations only go forward; no
 * `next/*` imports.
 */

import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const bakery = pgSchema('bakery')

/* -------------------------------------------------------------------------- */
/* Enums                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The order's journey. `baking` and `decorating` exist for the customer-facing
 * story ("Cốt bánh đang nướng… đang phủ kem…"), not because the kitchen needs
 * them to operate.
 */
export const orderStatusEnum = bakery.enum('order_status', [
  'pending',     // placed, waiting for payment or confirmation
  'confirmed',
  'baking',
  'decorating',
  'ready',       // ready for pickup or for the driver
  'delivering',
  'completed',
  'cancelled',
])

/**
 * Derived from the money actually received (`orders.paid_vnd`), never set by
 * hand: see `derivePaymentStatus` in src/server/payments/status.ts.
 * `underpaid` = something arrived but less than the deposit (a typo in the
 * amount); the owner sorts it out over Zalo.
 */
export const paymentStatusEnum = bakery.enum('payment_status', [
  'unpaid',
  'deposit_paid', // custom cakes take a deposit
  'paid',
  'refunded',
  'underpaid',
])

export const fulfillmentEnum = bakery.enum('fulfillment', ['pickup', 'delivery'])

/* -------------------------------------------------------------------------- */
/* Catalogue                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * `recipeId` points at `cookbook.recipes.id` — the same database, but a
 * different repo's schema. Deliberately NO foreign key: a cross-schema FK would
 * make this repo's migrations depend on the cookbook's, and the two deploy
 * independently. A dangling id just means "no nutrition label".
 *
 * `category` is text, not an enum: the menu will grow categories faster than
 * migrations should be written ("bánh kem", "pastry", "bánh Việt", "hộp quà").
 */
export const products = bakery.table('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  /** One line under the name on menu cards: "Hộp 4 cái · vỏ tự cán, nhân quế". */
  summary: text('summary'),
  /** Slug from src/lib/catalog.ts CATEGORIES. */
  category: text('category').notNull(),
  basePriceVnd: integer('base_price_vnd').notNull(),
  /** Hours of notice needed. Drives the earliest date the checkout offers. */
  leadTimeHours: integer('lead_time_hours').notNull().default(24),
  recipeId: uuid('recipe_id'),
  /** Made to order (custom cakes): 50% deposit. Otherwise paid in full up front. */
  takesDeposit: boolean('takes_deposit').notNull().default(false),
  /** Shown under "Bánh được yêu nhất" on the home page. */
  featured: boolean('featured').notNull().default(false),
  /** Set = listed but not orderable, with this reason ("Hết mùa xoài, quay lại tháng 4"). */
  soldOutNote: text('sold_out_note'),
  /** Placeholder colour until there is a photo. */
  tone: text('tone').notNull().default('#FDE3EC'),
  /** Supabase Storage key of the product photo. */
  photoKey: text('photo_key'),
  isActive: boolean('is_active').notNull().default(true),
  position: smallint('position').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('products_slug_idx').on(t.slug),
  index('products_menu_idx').on(t.category, t.position).where(sql`${t.isActive}`),
])

/**
 * Choices within a product — the custom cake builder's raw material. `group`
 * is "size", "cốt", "nhân", "trang trí"; each option adjusts the price.
 */
export const productOptions = bakery.table('product_options', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  group: text('group').notNull(),
  label: text('label').notNull(),
  /** Second line on the choice chip: "18cm". */
  detail: text('detail'),
  priceDeltaVnd: integer('price_delta_vnd').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  position: smallint('position').notNull().default(0),
}, (t) => [
  index('product_options_product_idx').on(t.productId, t.group, t.position),
])

/* -------------------------------------------------------------------------- */
/* Customers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Keyed by phone number — that is how Vietnamese customers identify themselves
 * (Zalo, delivery drivers, COD). No password, no Supabase Auth account: buying
 * a cake must not require signing up, and customers must not land in the auth
 * user table shared with the owner's personal apps.
 *
 * `phone` is normalised to digits with country code (84912345678) before it
 * is stored, or the same person becomes three customers.
 *
 * `marketingConsentAt` is the proof of consent Law 91/2025 on personal data
 * requires. Null = transactional messages only (order updates), no marketing.
 */
export const customers = bakery.table('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull(),
  name: text('name'),
  email: text('email'),
  zaloUserId: text('zalo_user_id'),
  /** Allergies, preferences, "không thích quá ngọt". Shown on every order. */
  notes: text('notes'),
  marketingConsentAt: timestamp('marketing_consent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('customers_phone_idx').on(t.phone),
])

/**
 * "Remember my mum's birthday" — the retention feature for a birthday-cake
 * business. Remind the customer `remindDaysBefore` days ahead.
 *
 * Month + day, no year: it recurs, and people will not give a birth year.
 * `consentAt` is NOT NULL because an occasion only exists if the customer
 * asked to be reminded — storing someone's family dates without that is
 * exactly what the data protection law is about.
 *
 * `lastRemindedYear` makes the daily reminder job idempotent: it can run
 * twice, or be retried, without messaging anyone twice.
 */
export const occasions = bakery.table('occasions', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  personName: text('person_name'),
  month: smallint('month').notNull(),
  day: smallint('day').notNull(),
  remindDaysBefore: smallint('remind_days_before').notNull().default(7),
  consentAt: timestamp('consent_at', { withTimezone: true }).notNull(),
  lastRemindedYear: smallint('last_reminded_year'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('occasions_customer_idx').on(t.customerId),
  index('occasions_date_idx').on(t.month, t.day),
])

/* -------------------------------------------------------------------------- */
/* Orders                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * `code` is what humans say ("đơn HB-2413"); `id` is what the system uses.
 * `trackToken` is the unguessable part of the customer's tracking link, so
 * order tracking needs no login and order ids are not enumerable.
 *
 * Totals are stored, not derived: an order is a record of what was charged,
 * and must not change if a product's price changes later.
 *
 * `code` doubles as the bank transfer memo ("VB123456"): SePay extracts it
 * from the transfer content, and the webhook finds the order by it.
 * `paidVnd` caches the sum of `payments` for this order, rewritten in the
 * same transaction that records a payment.
 */
export const orders = bakery.table('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull(),
  trackToken: text('track_token').notNull(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  status: orderStatusEnum('status').notNull().default('pending'),
  paymentStatus: paymentStatusEnum('payment_status').notNull().default('unpaid'),
  fulfillment: fulfillmentEnum('fulfillment').notNull(),
  /** When the customer receives it (pickup time or delivery time). */
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
  deliveryAddress: text('delivery_address'),

  // Gift mode: someone else receives it.
  recipientName: text('recipient_name'),
  recipientPhone: text('recipient_phone'),
  /** Printed on the handwritten-style card in the box. */
  giftNote: text('gift_note'),
  /** Leave the price off anything the recipient sees. */
  hidePrice: boolean('hide_price').notNull().default(false),

  subtotalVnd: integer('subtotal_vnd').notNull(),
  deliveryFeeVnd: integer('delivery_fee_vnd').notNull().default(0),
  discountVnd: integer('discount_vnd').notNull().default(0),
  totalVnd: integer('total_vnd').notNull(),
  depositVnd: integer('deposit_vnd').notNull().default(0),
  paidVnd: integer('paid_vnd').notNull().default(0),
  /** The deposit must arrive by then or the bake slot is released. */
  paymentDueAt: timestamp('payment_due_at', { withTimezone: true }),

  /** Customer-facing note from checkout ("giao trước 5h chiều"). */
  customerNote: text('customer_note'),
  /** utm_source / utm_campaign etc. captured at landing. Marketing attribution. */
  attribution: jsonb('attribution').notNull().default(sql`'{}'::jsonb`),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('orders_code_idx').on(t.code),
  uniqueIndex('orders_track_token_idx').on(t.trackToken),
  index('orders_customer_idx').on(t.customerId, t.createdAt),
  // The bake-day list: "what do I make tomorrow".
  index('orders_scheduled_idx').on(t.scheduledFor),
])

/**
 * Line items snapshot the product name, options and price at order time, so
 * editing or retiring a product never rewrites past orders.
 */
export const orderItems = bakery.table('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(),
  /** [{ group, label, priceDeltaVnd }] as chosen. */
  options: jsonb('options').notNull().default(sql`'[]'::jsonb`),
  /** Text piped onto the cake: "Mừng sinh nhật Mẹ". */
  cakeMessage: text('cake_message'),
  quantity: smallint('quantity').notNull(),
  unitPriceVnd: integer('unit_price_vnd').notNull(),
  lineTotalVnd: integer('line_total_vnd').notNull(),
}, (t) => [
  index('order_items_order_idx').on(t.orderId),
  index('order_items_product_idx').on(t.productId),
])

/**
 * The order's story, append-only. Each row is one moment the customer can see
 * on the tracking page — a status change, a message from the baker, a photo of
 * *their* cake before it leaves.
 *
 * `orders.status` is the current state (read on every admin list);
 * this table is the narrative. Written together in one transaction.
 *
 * `photoKey` is a Supabase Storage key; images never go in Postgres.
 */
export const orderEvents = bakery.table('order_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  status: orderStatusEnum('status'),
  message: text('message'),
  photoKey: text('photo_key'),
  visibleToCustomer: boolean('visible_to_customer').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('order_events_order_idx').on(t.orderId, t.createdAt),
])

/**
 * Money that arrived, one row per bank transaction — the ledger. Order payment
 * status is derived from these rows, so a lost or doubled webhook can never
 * leave an order "paid" without the money, or count the money twice.
 *
 * `(provider, providerRef)` is unique: SePay retries webhooks and the
 * reconcile job re-reads the same transactions; the insert that loses the race
 * does nothing. `providerRef` is SePay's transaction id.
 *
 * `orderId` is null when a transfer matched no order (wrong memo). Those rows
 * are kept for the owner to match by hand — the money is real either way.
 */
export const payments = bakery.table('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  provider: text('provider').notNull(),
  providerRef: text('provider_ref').notNull(),
  amountVnd: integer('amount_vnd').notNull(),
  /** Transfer memo exactly as the bank sent it. */
  content: text('content'),
  /** The bank's own reference (FT24012345678). */
  bankRef: text('bank_ref'),
  bank: text('bank'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
  /** `webhook` or `reconcile` — which path saw it first. */
  source: text('source').notNull(),
  raw: jsonb('raw').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('payments_provider_ref_idx').on(t.provider, t.providerRef),
  index('payments_order_idx').on(t.orderId),
  index('payments_unmatched_idx').on(t.receivedAt).where(sql`${t.orderId} is null`),
])
