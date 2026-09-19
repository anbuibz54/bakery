/**
 * Read-only view of the cookbook's tables.
 *
 * Same database, different schema, different repo. These definitions are NOT
 * part of this app's migrations — `drizzle.config.ts` only reads `schema.ts`,
 * so nothing here is ever created, altered or dropped by us. Columns are the
 * few the costing needs; the cookbook may have more.
 *
 * Rules: read only, never write; treat a missing recipe as "no cost data"
 * rather than an error, because the two apps deploy independently.
 *
 * No `next/*` imports.
 */

import { boolean, pgSchema, real, smallint, text, uuid } from 'drizzle-orm/pg-core'

export const cookbook = pgSchema('cookbook')

export const cbRecipes = cookbook.table('recipes', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  servings: real('servings').notNull(),
  yieldLabel: text('yield_label'),
  cookMinutes: text('cook_minutes'),
})

export const cbRecipeIngredients = cookbook.table('recipe_ingredients', {
  id: uuid('id').primaryKey(),
  recipeId: uuid('recipe_id').notNull(),
  position: smallint('position').notNull(),
  name: text('name').notNull(),
  quantity: real('quantity'),
  unit: text('unit'),
  foodId: uuid('food_id'),
  grams: real('grams'),
})

export const cbUsers = cookbook.table('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
})

/** Receipts the cookbook read from photos or from Claude (see cookbook CLAUDE.md "Receipts"). */
export const cbReceipts = cookbook.table('receipts', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').notNull(),
  storeName: text('store_name'),
  boughtOn: text('bought_on').notNull(),
  appliedAt: text('applied_at'),
})

export const cbReceiptLines = cookbook.table('receipt_lines', {
  id: uuid('id').primaryKey(),
  receiptId: uuid('receipt_id').notNull(),
  position: smallint('position').notNull(),
  name: text('name').notNull(),
  quantity: real('quantity'),
  unit: text('unit'),
  priceVnd: real('price_vnd'),
  forBakery: boolean('for_bakery').notNull(),
})
