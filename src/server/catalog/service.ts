/**
 * The menu as customers see it.
 *
 * No `next/*` imports.
 */

import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '../db'
import { productOptions, products } from '../db/schema'
import { PRODUCT_BUCKET, publicImageUrl } from '../storage/public-images'
import { listCategories } from './categories'

const card = {
  id: products.id,
  slug: products.slug,
  name: products.name,
  summary: products.summary,
  category: products.category,
  basePriceVnd: products.basePriceVnd,
  leadTimeHours: products.leadTimeHours,
  takesDeposit: products.takesDeposit,
  featured: products.featured,
  soldOutNote: products.soldOutNote,
  tone: products.tone,
  photoKey: products.photoKey,
}

const withPhoto = <T extends { photoKey: string | null }>(row: T) => ({ ...row, photoUrl: publicImageUrl(PRODUCT_BUCKET, row.photoKey) })

export type ProductCard = Awaited<ReturnType<typeof listMenu>>[number]

export async function listMenu() {
  const rows = await db
    .select(card)
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(asc(products.position), asc(products.name))

  // "từ 320.000đ" only when options change the price.
  const priced = await db
    .selectDistinct({ productId: productOptions.productId })
    .from(productOptions)
    .where(and(eq(productOptions.isActive, true), inArray(productOptions.productId, rows.map((r) => r.id))))
  const withOptions = new Set(priced.map((p) => p.productId))

  // Products in hidden or deleted sections stay off the menu.
  const sections = await listCategories()
  const order = new Map<string, number>(sections.map((c, i) => [c.slug, i]))
  return rows
    .filter((r) => order.has(r.category))
    .map((r) => withPhoto({ ...r, hasOptions: withOptions.has(r.id) }))
    .sort((a, b) => (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99))
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProduct>>>

export async function getProduct(slug: string) {
  const [product] = await db
    .select({ ...card, description: products.description, labourMinutes: products.labourMinutes, ovenMinutes: products.ovenMinutes })
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
  if (!product) return null

  const options = await db
    .select({
      id: productOptions.id,
      group: productOptions.group,
      label: productOptions.label,
      detail: productOptions.detail,
      priceDeltaVnd: productOptions.priceDeltaVnd,
    })
    .from(productOptions)
    .where(and(eq(productOptions.productId, product.id), eq(productOptions.isActive, true)))
    .orderBy(asc(productOptions.group), asc(productOptions.position))

  // Groups in the order their first option was positioned; "size" first.
  const groups: { name: string; options: typeof options }[] = []
  for (const o of options) {
    let g = groups.find((x) => x.name === o.group)
    if (!g) groups.push((g = { name: o.group, options: [] }))
    g.options.push(o)
  }
  groups.sort((a, b) => (a.name === 'size' ? -1 : b.name === 'size' ? 1 : 0))

  return { ...withPhoto(product), groups }
}

/** Products and their options for pricing a cart. Server-side prices only. */
export async function productsForPricing(ids: string[]) {
  if (ids.length === 0) return []
  const rows = await db.select().from(products).where(and(inArray(products.id, ids), eq(products.isActive, true)))
  const options = await db
    .select()
    .from(productOptions)
    .where(and(inArray(productOptions.productId, ids), eq(productOptions.isActive, true)))
  return rows.map((p) => ({ ...p, options: options.filter((o) => o.productId === p.id) }))
}
