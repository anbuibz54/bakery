/**
 * What a cake costs to make.
 *
 * The recipe (grams of what) comes from the cookbook; the money (what a gram
 * costs) comes from this app. Anything that cannot be priced is reported by
 * name — a cost that quietly skips an ingredient is worse than no cost at all.
 *
 * Per-unit cost = ingredients + packaging + oven energy + labour.
 * Per-order costs (payment plan share, delivery subsidy) are added by the
 * order-level functions, not baked into a product's unit cost.
 *
 * No `next/*` imports.
 */

import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '../db'
import { cbRecipeIngredients, cbRecipes } from '../db/cookbook'
import { ingredientPrices, ingredients, productComponents, productOptions, products, shopSettings } from '../db/schema'

export type CostLine = {
  name: string
  /** In the ingredient's unit, already scaled. */
  quantity: number | null
  unit: string
  costVnd: number | null
  /** Why there is no cost: no ingredient row, or no price yet. */
  missing?: 'ingredient' | 'price'
}

export type CostGroup = {
  label: string
  source: string
  lines: CostLine[]
  costVnd: number
}

export type ProductCost = {
  productId: string
  optionIds: string[]
  groups: CostGroup[]
  ingredientsVnd: number
  packagingVnd: number
  energyVnd: number
  labourVnd: number
  /** ingredients + packaging + energy + labour. */
  unitCostVnd: number
  /** Lines that could not be priced, by name. */
  missing: string[]
  settings: Settings
}

export type Settings = typeof shopSettings.$inferSelect

const DEFAULT_SETTINGS: Settings = {
  id: 'shop',
  labourPerHourVnd: 40_000,
  electricityPerKwhVnd: 3_000,
  ovenKw: 2,
  paymentPlanMonthlyVnd: 0,
  deliverySubsidyVnd: 0,
  targetIngredientPct: 0.35,
  targetMarginPct: 0.35,
  updatedAt: new Date(),
}

export async function getSettings(): Promise<Settings> {
  const [row] = await db.select().from(shopSettings).where(eq(shopSettings.id, 'shop'))
  return row ?? DEFAULT_SETTINGS
}

export async function saveSettings(patch: Partial<Omit<Settings, 'id' | 'updatedAt'>>) {
  await db
    .insert(shopSettings)
    .values({ ...DEFAULT_SETTINGS, ...patch, id: 'shop', updatedAt: new Date() })
    .onConflictDoUpdate({ target: shopSettings.id, set: { ...patch, updatedAt: new Date() } })
}

/** "Bơ lạt Anchor, cắt nhỏ" → "bo lat anchor cat nho". Diacritics stripped so typing is forgiving. */
export function matchKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type PricedIngredient = {
  id: string
  name: string
  matchKey: string
  foodId: string | null
  unit: string
  isPackaging: boolean
  unitCostVnd: number | null
}

/** Every ingredient with its latest price per unit. Small table; read it whole. */
export async function pricedIngredients(): Promise<PricedIngredient[]> {
  const rows = await db.select().from(ingredients)
  if (rows.length === 0) return []
  const latest = await db
    .selectDistinctOn([ingredientPrices.ingredientId], {
      ingredientId: ingredientPrices.ingredientId,
      priceVnd: ingredientPrices.priceVnd,
      packQuantity: ingredientPrices.packQuantity,
    })
    .from(ingredientPrices)
    .where(inArray(ingredientPrices.ingredientId, rows.map((r) => r.id)))
    .orderBy(ingredientPrices.ingredientId, desc(ingredientPrices.boughtOn), desc(ingredientPrices.createdAt))

  const byId = new Map(latest.map((p) => [p.ingredientId, p.packQuantity > 0 ? p.priceVnd / p.packQuantity : null]))
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    matchKey: r.matchKey,
    foodId: r.foodId,
    unit: r.unit,
    isPackaging: r.isPackaging,
    unitCostVnd: byId.get(r.id) ?? null,
  }))
}

function findIngredient(pool: PricedIngredient[], opts: { foodId?: string | null; name: string }) {
  if (opts.foodId) {
    const byFood = pool.find((i) => i.foodId === opts.foodId)
    if (byFood) return byFood
  }
  const key = matchKey(opts.name)
  return pool.find((i) => i.matchKey === key) ?? pool.find((i) => key.startsWith(`${i.matchKey} `) || key.includes(` ${i.matchKey} `))
}

/**
 * Cost one unit of a product with the given options chosen.
 *
 * `pool` and `settings` can be passed in when costing many products at once
 * (the bake-day list, the dashboard), so the small tables are read once.
 */
export async function costProduct(
  productId: string,
  optionIds: string[] = [],
  pool?: PricedIngredient[],
  settings?: Settings,
): Promise<ProductCost | null> {
  const [product] = await db.select().from(products).where(eq(products.id, productId))
  if (!product) return null
  const priced = pool ?? (await pricedIngredients())
  const config = settings ?? (await getSettings())

  const components = await db
    .select()
    .from(productComponents)
    .where(eq(productComponents.productId, productId))
    .orderBy(productComponents.position)
  const used = components.filter((c) => !c.optionId || optionIds.includes(c.optionId))

  const recipeIds = used.map((c) => c.recipeId).filter((id): id is string => Boolean(id))
  const [recipes, recipeLines] = await Promise.all([
    recipeIds.length ? db.select().from(cbRecipes).where(inArray(cbRecipes.id, recipeIds)) : [],
    recipeIds.length ? db.select().from(cbRecipeIngredients).where(inArray(cbRecipeIngredients.recipeId, recipeIds)).orderBy(cbRecipeIngredients.position) : [],
  ])

  const groups: CostGroup[] = []
  const missing: string[] = []
  let ingredientsVnd = 0
  let packagingVnd = 0

  for (const c of used) {
    const lines: CostLine[] = []
    if (c.recipeId) {
      const recipe = recipes.find((r) => r.id === c.recipeId)
      for (const l of recipeLines.filter((l) => l.recipeId === c.recipeId)) {
        const match = findIngredient(priced, { foodId: l.foodId, name: l.name })
        const quantity = (l.grams ?? l.quantity ?? 0) * c.multiplier
        const unit = l.grams != null ? 'g' : (l.unit ?? '')
        if (!match) {
          missing.push(l.name)
          lines.push({ name: l.name, quantity, unit, costVnd: null, missing: 'ingredient' })
        } else if (match.unitCostVnd == null) {
          missing.push(match.name)
          lines.push({ name: match.name, quantity, unit: match.unit, costVnd: null, missing: 'price' })
        } else {
          const costVnd = match.unitCostVnd * quantity
          lines.push({ name: match.name, quantity, unit: match.unit, costVnd })
        }
      }
      groups.push({
        label: c.label ?? recipe?.title ?? 'Thành phần',
        source: recipe ? `từ cookbook · ${recipe.title}${c.multiplier === 1 ? '' : ` × ${c.multiplier}`}` : 'công thức không còn trong cookbook',
        lines,
        costVnd: lines.reduce((s, l) => s + (l.costVnd ?? 0), 0),
      })
    } else if (c.ingredientId) {
      const match = priced.find((i) => i.id === c.ingredientId)
      const quantity = c.quantity ?? 0
      if (!match) {
        missing.push(c.label ?? 'nguyên liệu đã xoá')
        lines.push({ name: c.label ?? 'nguyên liệu đã xoá', quantity, unit: '', costVnd: null, missing: 'ingredient' })
      } else if (match.unitCostVnd == null) {
        missing.push(match.name)
        lines.push({ name: match.name, quantity, unit: match.unit, costVnd: null, missing: 'price' })
      } else {
        lines.push({ name: match.name, quantity, unit: match.unit, costVnd: match.unitCostVnd * quantity })
      }
      groups.push({ label: c.label ?? match?.name ?? 'Thêm', source: match?.isPackaging ? 'bao bì' : 'thêm tay', lines, costVnd: lines.reduce((s, l) => s + (l.costVnd ?? 0), 0) })
    }
  }

  for (const g of groups) {
    const packaging = g.source === 'bao bì'
    if (packaging) packagingVnd += g.costVnd
    else ingredientsVnd += g.costVnd
  }

  const energyVnd = (product.ovenMinutes / 60) * config.ovenKw * config.electricityPerKwhVnd
  const labourVnd = (product.labourMinutes / 60) * config.labourPerHourVnd

  return {
    productId,
    optionIds,
    groups,
    ingredientsVnd: Math.round(ingredientsVnd),
    packagingVnd: Math.round(packagingVnd),
    energyVnd: Math.round(energyVnd),
    labourVnd: Math.round(labourVnd),
    unitCostVnd: Math.round(ingredientsVnd + packagingVnd + energyVnd + labourVnd),
    missing: [...new Set(missing)],
    settings: config,
  }
}

/** Orders in the last 30 days, for spreading a monthly payment plan over them. */
export async function feePerOrderVnd(settings: Settings): Promise<number> {
  if (settings.paymentPlanMonthlyVnd <= 0) return 0
  const [{ n }] = await db.execute<{ n: number }>(
    sql`select count(*)::int as n from bakery.orders where created_at > now() - interval '30 days' and status <> 'cancelled'`,
  )
  return Math.round(settings.paymentPlanMonthlyVnd / Math.max(1, n))
}

/** The price that hits the owner's target margin, rounded up to 5.000đ. */
export function suggestedPriceVnd(unitCostVnd: number, targetMarginPct: number): number {
  const safe = Math.min(0.9, Math.max(0, targetMarginPct))
  return Math.ceil(unitCostVnd / (1 - safe) / 5000) * 5000
}

/** Which size/option combination the menu shows by default — the first option of each group. */
export async function defaultOptionIds(productId: string): Promise<string[]> {
  const rows = await db
    .select({ id: productOptions.id, group: productOptions.group })
    .from(productOptions)
    .where(and(eq(productOptions.productId, productId), eq(productOptions.isActive, true)))
    .orderBy(productOptions.group, productOptions.position)
  const seen = new Set<string>()
  return rows.filter((r) => (seen.has(r.group) ? false : (seen.add(r.group), true))).map((r) => r.id)
}
