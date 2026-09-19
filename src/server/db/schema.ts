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
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  real,
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
 * amount); the owner sorts it out by message.
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
  /** Slug of a row in `categories`. Text, no FK: an unknown slug just hides the product. */
  category: text('category').notNull(),
  basePriceVnd: integer('base_price_vnd').notNull(),
  /** Hours of notice needed. Drives the earliest date the checkout offers. */
  leadTimeHours: integer('lead_time_hours').notNull().default(24),
  /** Hands-on minutes and oven minutes for one of these — labour and energy cost. */
  labourMinutes: integer('labour_minutes').notNull().default(0),
  ovenMinutes: integer('oven_minutes').notNull().default(0),
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
 * (delivery drivers, COD, bank transfers). No password, no Supabase Auth account: buying
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
  /** Unused: the shop does not use Zalo. Kept to avoid a migration; drop when convenient. */
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
  /** Derived from `attribution` at checkout: instagram | facebook | tiktok | direct | other. */
  channel: text('channel').notNull().default('direct'),

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
  /** Cost of one unit when the order was placed. Null = it could not be costed. */
  unitCostVnd: integer('unit_cost_vnd'),
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

/* -------------------------------------------------------------------------- */
/* Costing and supply                                                          */
/* -------------------------------------------------------------------------- */

/** Where the shop buys: "Bếp Bánh Q.7", "Chợ Tân Mỹ", "Bách Hóa Xanh". */
export const suppliers = bakery.table('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('suppliers_name_idx').on(t.name)])

/**
 * A thing the shop buys, as the shop says it ("Bơ lạt Anchor").
 *
 * `matchKey` is the normalised name, so a recipe line ("bơ lạt Anchor, cắt
 * nhỏ") finds its price without a foreign key across schemas. `foodId` points
 * at `cookbook.foods.id` when the ingredient is linked there — the stronger
 * match, tried first. No FK: different repo, independent deploys.
 *
 * `unit` is what the price is per: 'g' for anything weighed, 'ml' for liquids,
 * 'cai' for counted things (trứng, hộp).
 */
export const ingredients = bakery.table('ingredients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  matchKey: text('match_key').notNull(),
  foodId: uuid('food_id'),
  unit: text('unit').notNull().default('g'),
  /** Packaging and other non-food buys are costed the same way. */
  isPackaging: boolean('is_packaging').notNull().default(false),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('ingredients_match_key_idx').on(t.matchKey),
  index('ingredients_food_idx').on(t.foodId),
])

/**
 * One purchase price, kept forever. The newest row prices new orders; the old
 * rows draw the trend and explain an old order's margin.
 *
 * `packQuantity` is in the ingredient's unit (1000 for a 1kg pack), so the
 * unit cost is `priceVnd / packQuantity`.
 */
export const ingredientPrices = bakery.table('ingredient_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredients.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
  /** As written on the shelf: "1kg", "hộp 10 cái". */
  packLabel: text('pack_label'),
  packQuantity: real('pack_quantity').notNull(),
  priceVnd: integer('price_vnd').notNull(),
  boughtOn: date('bought_on').notNull(),
  /** 'hand' | 'receipt' | 'mcp' — how it got here. */
  source: text('source').notNull().default('hand'),
  /** `cookbook.receipt_lines.id` when imported from a receipt — each line is imported once. */
  sourceRef: text('source_ref'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('ingredient_prices_latest_idx').on(t.ingredientId, t.boughtOn),
  index('ingredient_prices_supplier_idx').on(t.supplierId),
  uniqueIndex('ingredient_prices_source_ref_idx').on(t.sourceRef).where(sql`${t.sourceRef} is not null`),
])

/**
 * What a product is made of: either a cookbook recipe scaled by `multiplier`,
 * or a direct ingredient line (250g dâu on top, the box it ships in).
 *
 * `optionId` set = the component only applies when that option is chosen, so a
 * 22cm cake can use more cream than a 14cm one.
 */
export const productComponents = bakery.table('product_components', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  optionId: uuid('option_id').references(() => productOptions.id, { onDelete: 'cascade' }),
  label: text('label'),
  /** `cookbook.recipes.id`. No FK on purpose (other repo's schema). */
  recipeId: uuid('recipe_id'),
  multiplier: real('multiplier').notNull().default(1),
  ingredientId: uuid('ingredient_id').references(() => ingredients.id, { onDelete: 'set null' }),
  /** In the ingredient's unit. */
  quantity: real('quantity'),
  position: smallint('position').notNull().default(0),
}, (t) => [
  index('product_components_product_idx').on(t.productId, t.position),
  index('product_components_option_idx').on(t.optionId),
  index('product_components_ingredient_idx').on(t.ingredientId),
])

/**
 * The rates behind every cost that is not an ingredient. One row; `id` is
 * always 'shop' so it cannot be duplicated.
 */
export const shopSettings = bakery.table('shop_settings', {
  id: text('id').primaryKey().default('shop'),
  labourPerHourVnd: integer('labour_per_hour_vnd').notNull().default(40_000),
  electricityPerKwhVnd: integer('electricity_per_kwh_vnd').notNull().default(3_000),
  ovenKw: real('oven_kw').notNull().default(2),
  /** Monthly payment-provider plan, spread over the orders in the month. */
  paymentPlanMonthlyVnd: integer('payment_plan_monthly_vnd').notNull().default(0),
  /** What the shop pays out of pocket per delivery, if anything. */
  deliverySubsidyVnd: integer('delivery_subsidy_vnd').notNull().default(0),
  /** Warn when ingredients pass this share of the price. */
  targetIngredientPct: real('target_ingredient_pct').notNull().default(0.35),
  /** The real margin (after labour) the owner wants. */
  targetMarginPct: real('target_margin_pct').notNull().default(0.35),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Yardsticks the dashboard compares the shop against: a published range for
 * small bakeries, or a competitor's real price. Entered by hand (or by Claude
 * with a source) — never scraped silently, never guessed.
 */
export const benchmarks = bakery.table('benchmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** 'ingredient_pct' | 'margin_pct' | 'aov_vnd' | 'orders_per_week' … */
  metric: text('metric').notNull(),
  label: text('label').notNull(),
  lowValue: real('low_value'),
  highValue: real('high_value'),
  source: text('source'),
  note: text('note'),
  checkedOn: date('checked_on'),
}, (t) => [uniqueIndex('benchmarks_metric_idx').on(t.metric)])

/** A competitor's price for a comparable cake, for the price-position view. */
export const competitorPrices = bakery.table('competitor_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  shopName: text('shop_name').notNull(),
  category: text('category').notNull(),
  productLabel: text('product_label').notNull(),
  /** "18cm", "hộp 4 cái" — compare like with like. */
  sizeLabel: text('size_label'),
  priceVnd: integer('price_vnd').notNull(),
  url: text('url'),
  checkedOn: date('checked_on').notNull(),
  note: text('note'),
}, (t) => [
  index('competitor_prices_category_idx').on(t.category, t.checkedOn),
])

/* -------------------------------------------------------------------------- */
/* Brand                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * What the shop is called and how it looks, editable by the owner at
 * /quan-ly/thuong-hieu. One row, `id` always 'shop'. No row = the defaults in
 * src/lib/brand.ts.
 *
 * `palette` holds the CSS colour tokens (see BRAND_TOKENS); the root layout
 * writes them onto <html>, so every page follows without a redeploy.
 * `logoPath` is a file in the public `bakery-brand` Storage bucket.
 */
export const brandSettings = bakery.table('brand_settings', {
  id: text('id').primaryKey().default('shop'),
  name: text('name').notNull(),
  /** How the name is drawn in the header, e.g. lower case "vibe baking". */
  wordmark: text('wordmark').notNull(),
  tagline: text('tagline'),
  logoPath: text('logo_path'),
  palette: jsonb('palette').notNull().default(sql`'{}'::jsonb`),
  instagramUrl: text('instagram_url'),
  facebookUrl: text('facebook_url'),
  tiktokUrl: text('tiktok_url'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Menu sections ("Bánh kem sinh nhật", "Pastry & ngàn lớp"…), editable by the
 * owner at /quan-ly/san-pham. `products.category` holds the slug; the slug
 * never changes once created, so renaming a section keeps its products.
 * `icon` is a StampIcon name.
 */
export const categories = bakery.table('categories', {
  slug: text('slug').primaryKey(),
  title: text('title').notNull(),
  /** Short label for chips and the header nav. */
  chip: text('chip').notNull(),
  /** One line under the section title: lead time, deposit… */
  note: text('note'),
  icon: text('icon').notNull().default('cake'),
  position: smallint('position').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
