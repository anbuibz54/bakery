/**
 * The shop's buying side: ingredients, suppliers, price history, and what each
 * product is made of.
 *
 * Prices are append-only. Correcting a price means adding a newer row, so the
 * trend and old orders' margins stay truthful.
 *
 * No `next/*` imports.
 */

import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { cbRecipes } from '../db/cookbook'
import { ingredientPrices, ingredients, productComponents, products, suppliers } from '../db/schema'
import { matchKey } from './service'

export class CostingError extends Error {}

/* -------------------------------------------------------------------------- */
/* Suppliers                                                                   */
/* -------------------------------------------------------------------------- */

export async function listSuppliers() {
  return db.select().from(suppliers).orderBy(asc(suppliers.name))
}

export async function ensureSupplier(name: string): Promise<string | null> {
  const clean = name.trim()
  if (!clean) return null
  const [row] = await db
    .insert(suppliers)
    .values({ name: clean })
    .onConflictDoUpdate({ target: suppliers.name, set: { name: clean } })
    .returning({ id: suppliers.id })
  return row.id
}

/* -------------------------------------------------------------------------- */
/* Ingredients and prices                                                      */
/* -------------------------------------------------------------------------- */

export type IngredientRow = {
  id: string
  name: string
  unit: string
  isPackaging: boolean
  foodId: string | null
  latest: { priceVnd: number; packQuantity: number; packLabel: string | null; boughtOn: string; supplier: string | null } | null
  unitCostVnd: number | null
  /** Change against the price before the latest one, when there is one. */
  trend: number | null
}

export async function listIngredients(): Promise<IngredientRow[]> {
  const rows = await db.select().from(ingredients).orderBy(asc(ingredients.isPackaging), asc(ingredients.name))
  if (rows.length === 0) return []

  const prices = await db
    .select({
      ingredientId: ingredientPrices.ingredientId,
      priceVnd: ingredientPrices.priceVnd,
      packQuantity: ingredientPrices.packQuantity,
      packLabel: ingredientPrices.packLabel,
      boughtOn: ingredientPrices.boughtOn,
      createdAt: ingredientPrices.createdAt,
      supplier: suppliers.name,
    })
    .from(ingredientPrices)
    .leftJoin(suppliers, eq(suppliers.id, ingredientPrices.supplierId))
    .where(inArray(ingredientPrices.ingredientId, rows.map((r) => r.id)))
    .orderBy(desc(ingredientPrices.boughtOn), desc(ingredientPrices.createdAt))

  return rows.map((r) => {
    const own = prices.filter((p) => p.ingredientId === r.id)
    const latest = own[0] ?? null
    const previous = own[1] ?? null
    const unitCost = latest && latest.packQuantity > 0 ? latest.priceVnd / latest.packQuantity : null
    const prevUnit = previous && previous.packQuantity > 0 ? previous.priceVnd / previous.packQuantity : null
    return {
      id: r.id,
      name: r.name,
      unit: r.unit,
      isPackaging: r.isPackaging,
      foodId: r.foodId,
      latest: latest ? { priceVnd: latest.priceVnd, packQuantity: latest.packQuantity, packLabel: latest.packLabel, boughtOn: latest.boughtOn, supplier: latest.supplier } : null,
      unitCostVnd: unitCost,
      trend: unitCost != null && prevUnit ? (unitCost - prevUnit) / prevUnit : null,
    }
  })
}

export async function priceHistory(ingredientId: string) {
  return db
    .select({
      id: ingredientPrices.id,
      priceVnd: ingredientPrices.priceVnd,
      packQuantity: ingredientPrices.packQuantity,
      packLabel: ingredientPrices.packLabel,
      boughtOn: ingredientPrices.boughtOn,
      source: ingredientPrices.source,
      supplier: suppliers.name,
    })
    .from(ingredientPrices)
    .leftJoin(suppliers, eq(suppliers.id, ingredientPrices.supplierId))
    .where(eq(ingredientPrices.ingredientId, ingredientId))
    .orderBy(desc(ingredientPrices.boughtOn), desc(ingredientPrices.createdAt))
}

export const priceInput = z.object({
  /** Existing ingredient, or a name to create one. */
  ingredientId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  /** Required for a new ingredient (defaults to g); for an existing one it is checked if given. */
  unit: z.enum(['g', 'ml', 'cai']).optional(),
  isPackaging: z.boolean().default(false),
  packQuantity: z.number().positive(),
  packLabel: z.string().trim().max(60).optional(),
  priceVnd: z.number().int().positive(),
  supplier: z.string().trim().max(120).optional(),
  boughtOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(['hand', 'receipt', 'mcp']).default('hand'),
  note: z.string().trim().max(200).optional(),
  /** Receipt line id when imported from the cookbook: a second import of it is a no-op. */
  sourceRef: z.string().max(80).optional(),
})
export type PriceInput = z.input<typeof priceInput>

/** Record a purchase price, creating the ingredient the first time it is bought. */
export async function recordPrice(raw: PriceInput): Promise<{ ingredientId: string; inserted: boolean }> {
  const input = priceInput.parse(raw)
  let ingredientId = input.ingredientId

  const UNIT_LABEL: Record<string, string> = { g: 'gram', ml: 'ml', cai: 'cái' }
  if (!ingredientId) {
    if (!input.name) throw new CostingError('Thiếu tên nguyên liệu.')
    const key = matchKey(input.name)
    // Same name, different unit: a price per box must never land on an
    // ingredient costed per gram (it would read as millions per kg).
    const [existing] = await db.select({ unit: ingredients.unit }).from(ingredients).where(eq(ingredients.matchKey, key))
    if (existing && existing.unit !== (input.unit ?? 'g')) {
      throw new CostingError(`"${input.name}" đã có trong bảng giá, tính theo ${UNIT_LABEL[existing.unit] ?? existing.unit}. Nhập lại theo đơn vị đó.`)
    }
    const [row] = await db
      .insert(ingredients)
      .values({ name: input.name, matchKey: key, unit: input.unit ?? 'g', isPackaging: input.isPackaging })
      .onConflictDoUpdate({ target: ingredients.matchKey, set: { name: input.name } })
      .returning({ id: ingredients.id })
    ingredientId = row.id
  }

  else {
    const [existing] = await db.select({ unit: ingredients.unit, name: ingredients.name }).from(ingredients).where(eq(ingredients.id, ingredientId))
    if (!existing) throw new CostingError('Không tìm thấy nguyên liệu.')
    if (input.unit && existing.unit !== input.unit) {
      throw new CostingError(`"${existing.name}" tính theo ${UNIT_LABEL[existing.unit] ?? existing.unit}, giá vừa nhập theo ${UNIT_LABEL[input.unit] ?? input.unit}.`)
    }
  }

  const supplierId = input.supplier ? await ensureSupplier(input.supplier) : null
  const rows = await db.insert(ingredientPrices).values({
    ingredientId,
    supplierId,
    packLabel: input.packLabel,
    packQuantity: input.packQuantity,
    priceVnd: input.priceVnd,
    boughtOn: input.boughtOn,
    source: input.source,
    note: input.note,
    sourceRef: input.sourceRef ?? null,
  }).onConflictDoNothing().returning({ id: ingredientPrices.id })
  return { ingredientId: ingredientId!, inserted: rows.length > 0 }
}

/** Ingredients a recipe needs that this shop has never bought — the gaps in costing. */
export async function unpricedNames(): Promise<string[]> {
  const rows = await listIngredients()
  return rows.filter((r) => r.unitCostVnd == null).map((r) => r.name)
}

/* -------------------------------------------------------------------------- */
/* What a product is made of                                                   */
/* -------------------------------------------------------------------------- */

export async function listComponents(productId: string) {
  const rows = await db
    .select({
      id: productComponents.id,
      label: productComponents.label,
      recipeId: productComponents.recipeId,
      multiplier: productComponents.multiplier,
      ingredientId: productComponents.ingredientId,
      quantity: productComponents.quantity,
      optionId: productComponents.optionId,
      position: productComponents.position,
      ingredientName: ingredients.name,
      ingredientUnit: ingredients.unit,
      recipeTitle: cbRecipes.title,
    })
    .from(productComponents)
    .leftJoin(ingredients, eq(ingredients.id, productComponents.ingredientId))
    .leftJoin(cbRecipes, eq(cbRecipes.id, productComponents.recipeId))
    .where(eq(productComponents.productId, productId))
    .orderBy(asc(productComponents.position))
  return rows
}

export const componentInput = z.object({
  productId: z.string().uuid(),
  optionId: z.string().uuid().nullish(),
  label: z.string().trim().max(80).optional(),
  recipeId: z.string().uuid().optional(),
  multiplier: z.number().positive().max(50).default(1),
  ingredientId: z.string().uuid().optional(),
  quantity: z.number().positive().max(100_000).optional(),
})

export async function addComponent(raw: z.input<typeof componentInput>) {
  const input = componentInput.parse(raw)
  if (!input.recipeId && !input.ingredientId) throw new CostingError('Chọn một công thức hoặc một nguyên liệu.')
  if (input.ingredientId && !input.quantity) throw new CostingError('Nhập số lượng cho nguyên liệu.')
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${productComponents.position}), -1) + 1` })
    .from(productComponents)
    .where(eq(productComponents.productId, input.productId))
  await db.insert(productComponents).values({ ...input, optionId: input.optionId ?? null, position: next })
}

export async function removeComponent(id: string) {
  await db.delete(productComponents).where(eq(productComponents.id, id))
}

export async function setProductTimes(productId: string, labourMinutes: number, ovenMinutes: number) {
  await db
    .update(products)
    .set({ labourMinutes: Math.max(0, Math.round(labourMinutes)), ovenMinutes: Math.max(0, Math.round(ovenMinutes)), updatedAt: new Date() })
    .where(eq(products.id, productId))
}

/** Recipes in the owner's cookbook, for picking a component. */
export async function searchRecipes(query: string, limit = 12) {
  const q = query.trim()
  return db
    .select({ id: cbRecipes.id, title: cbRecipes.title, servings: cbRecipes.servings, yieldLabel: cbRecipes.yieldLabel })
    .from(cbRecipes)
    .where(q ? or(ilike(cbRecipes.title, `%${q}%`), sql`false`) : undefined)
    .orderBy(asc(cbRecipes.title))
    .limit(limit)
}

/** Ingredients for a picker, newest first when they have no price yet. */
export async function ingredientOptions() {
  return db
    .select({ id: ingredients.id, name: ingredients.name, unit: ingredients.unit, isPackaging: ingredients.isPackaging })
    .from(ingredients)
    .where(and(eq(ingredients.isPackaging, false)))
    .orderBy(asc(ingredients.name))
}

export async function packagingOptions() {
  return db
    .select({ id: ingredients.id, name: ingredients.name, unit: ingredients.unit })
    .from(ingredients)
    .where(eq(ingredients.isPackaging, true))
    .orderBy(asc(ingredients.name))
}
