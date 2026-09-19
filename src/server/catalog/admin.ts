/**
 * The owner's product editor: products, their options (size, cốt…), photos,
 * and creating a product straight from a cookbook recipe.
 *
 * Rules that protect history:
 *  - The slug is set once. It is the product's URL; changing it would break
 *    links already shared on Facebook.
 *  - Removing an option only switches it off. Past orders keep their snapshot
 *    either way, but costing components can be tied to an option id.
 *  - A product that was ever ordered cannot be deleted, only hidden.
 *
 * No `next/*` imports.
 */

import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { cbRecipes, cbUsers } from '../db/cookbook'
import { orderItems, productComponents, productOptions, products } from '../db/schema'
import { slugify } from '../../lib/catalog'
import { ownerEmails } from '../owner'
import { PRODUCT_BUCKET, publicImageUrl, removePublicImage, uploadPublicImage } from '../storage/public-images'

export class ProductError extends Error {}

export async function listProductsAdmin() {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      category: products.category,
      basePriceVnd: products.basePriceVnd,
      isActive: products.isActive,
      featured: products.featured,
      soldOutNote: products.soldOutNote,
      tone: products.tone,
      photoKey: products.photoKey,
      position: products.position,
      recipeId: products.recipeId,
    })
    .from(products)
    .orderBy(asc(products.position), asc(products.name))
  return rows.map((r) => ({ ...r, photoUrl: publicImageUrl(PRODUCT_BUCKET, r.photoKey) }))
}

export async function getProductAdmin(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id))
  if (!product) return null
  const [options, [recipe], [ordered]] = await Promise.all([
    db
      .select()
      .from(productOptions)
      .where(and(eq(productOptions.productId, id), eq(productOptions.isActive, true)))
      .orderBy(asc(productOptions.position)),
    product.recipeId ? db.select({ title: cbRecipes.title }).from(cbRecipes).where(eq(cbRecipes.id, product.recipeId)) : Promise.resolve([]),
    db.select({ n: sql<number>`count(*)::int` }).from(orderItems).where(eq(orderItems.productId, id)),
  ])
  return {
    ...product,
    photoUrl: publicImageUrl(PRODUCT_BUCKET, product.photoKey),
    options,
    recipeTitle: recipe?.title ?? null,
    timesOrdered: ordered?.n ?? 0,
  }
}

const HEX = /^#[0-9a-f]{6}$/i

export const productInput = z.object({
  name: z.string().trim().min(1, 'Bánh cần một cái tên.').max(80),
  category: z.string().trim().min(1, 'Chọn loại bánh.'),
  summary: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  basePriceVnd: z.number().int().min(0, 'Giá không âm.').max(50_000_000),
  leadTimeHours: z.number().int().min(0).max(24 * 30),
  takesDeposit: z.boolean(),
  featured: z.boolean(),
  soldOutNote: z.string().trim().max(120).optional(),
  tone: z.string().refine((v) => HEX.test(v), 'Màu nền phải dạng #RRGGBB.'),
  isActive: z.boolean(),
  position: z.number().int().min(0).max(999),
  recipeId: z.string().uuid().nullish(),
})
export type ProductInput = z.input<typeof productInput>

function parse(raw: ProductInput) {
  const parsed = productInput.safeParse(raw)
  if (!parsed.success) throw new ProductError(parsed.error.issues[0]?.message ?? 'Thông tin chưa hợp lệ.')
  const p = parsed.data
  return {
    name: p.name,
    category: p.category,
    summary: p.summary || null,
    description: p.description || null,
    basePriceVnd: p.basePriceVnd,
    leadTimeHours: p.leadTimeHours,
    takesDeposit: p.takesDeposit,
    featured: p.featured,
    soldOutNote: p.soldOutNote || null,
    tone: p.tone.toLowerCase(),
    isActive: p.isActive,
    position: p.position,
    recipeId: p.recipeId ?? null,
  }
}

async function freeSlug(name: string) {
  const base = slugify(name) || 'banh'
  const taken = new Set(
    (await db.select({ slug: products.slug }).from(products).where(sql`${products.slug} like ${`${base}%`}`)).map((r) => r.slug),
  )
  let slug = base
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
  return slug
}

export async function createProduct(raw: ProductInput): Promise<string> {
  const values = parse(raw)
  const [row] = await db
    .insert(products)
    .values({ ...values, slug: await freeSlug(values.name) })
    .returning({ id: products.id })
  return row.id
}

export async function updateProduct(id: string, raw: ProductInput) {
  const values = parse(raw)
  await db.update(products).set({ ...values, updatedAt: new Date() }).where(eq(products.id, id))
}

/**
 * A new product from one of the owner's cookbook recipes: name and blurb from
 * the recipe, the recipe linked for costing (component × 1), price set by the
 * owner. Only the owner's own recipes can be used.
 */
export async function createFromRecipe(input: { recipeId: string; category: string; basePriceVnd: number; takesDeposit: boolean }) {
  const emails = ownerEmails()
  const [recipe] = await db
    .select({ id: cbRecipes.id, title: cbRecipes.title, summary: cbRecipes.summary })
    .from(cbRecipes)
    .innerJoin(cbUsers, eq(cbUsers.id, cbRecipes.userId))
    .where(and(eq(cbRecipes.id, input.recipeId), inArray(sql`lower(${cbUsers.email})`, emails.length ? emails : ['-'])))
  if (!recipe) throw new ProductError('Không tìm thấy công thức này trong cookbook của bạn.')

  const id = await createProduct({
    name: recipe.title,
    category: input.category,
    summary: recipe.summary?.slice(0, 120) ?? undefined,
    description: recipe.summary ?? undefined,
    basePriceVnd: input.basePriceVnd,
    leadTimeHours: input.takesDeposit ? 48 : 24,
    takesDeposit: input.takesDeposit,
    featured: false,
    tone: '#fde3ec',
    // New products start hidden: the owner adds a photo and options first.
    isActive: false,
    position: 50,
    recipeId: recipe.id,
  })
  await db.insert(productComponents).values({ productId: id, recipeId: recipe.id, multiplier: 1, label: recipe.title, position: 0 })
  return id
}

/* -------------------------------------------------------------------------- */
/* Options                                                                     */
/* -------------------------------------------------------------------------- */

const optionsInput = z
  .array(
    z.object({
      id: z.string().uuid().optional(),
      group: z.string().trim().min(1, 'Mỗi lựa chọn cần một nhóm (size, cốt bánh…).').max(40),
      label: z.string().trim().min(1, 'Mỗi lựa chọn cần một tên.').max(60),
      detail: z.string().trim().max(40).optional(),
      priceDeltaVnd: z.number().int().min(-10_000_000).max(10_000_000),
    }),
  )
  .max(40)

/**
 * Replace the product's option list with this one: existing ids are updated,
 * new rows inserted, missing ones switched off (never deleted).
 */
export async function saveOptions(productId: string, raw: z.input<typeof optionsInput>) {
  const parsed = optionsInput.safeParse(raw)
  if (!parsed.success) throw new ProductError(parsed.error.issues[0]?.message ?? 'Lựa chọn chưa hợp lệ.')
  const list = parsed.data

  await db.transaction(async (tx) => {
    const current = await tx.select({ id: productOptions.id }).from(productOptions).where(eq(productOptions.productId, productId))
    const currentIds = new Set(current.map((c) => c.id))
    const kept = new Set<string>()

    for (const [position, o] of list.entries()) {
      const values = { group: o.group, label: o.label, detail: o.detail || null, priceDeltaVnd: o.priceDeltaVnd, position, isActive: true }
      if (o.id && currentIds.has(o.id)) {
        kept.add(o.id)
        await tx.update(productOptions).set(values).where(eq(productOptions.id, o.id))
      } else {
        await tx.insert(productOptions).values({ productId, ...values })
      }
    }
    const gone = [...currentIds].filter((id) => !kept.has(id))
    if (gone.length) await tx.update(productOptions).set({ isActive: false }).where(inArray(productOptions.id, gone))
  })
}

/* -------------------------------------------------------------------------- */
/* Photo, delete                                                               */
/* -------------------------------------------------------------------------- */

export async function setProductPhoto(productId: string, file: Blob) {
  const [product] = await db.select({ photoKey: products.photoKey }).from(products).where(eq(products.id, productId))
  if (!product) throw new ProductError('Không tìm thấy bánh.')
  const path = await uploadPublicImage(PRODUCT_BUCKET, productId, file)
  await db.update(products).set({ photoKey: path, updatedAt: new Date() }).where(eq(products.id, productId))
  await removePublicImage(PRODUCT_BUCKET, product.photoKey)
}

export async function removeProductPhoto(productId: string) {
  const [product] = await db.select({ photoKey: products.photoKey }).from(products).where(eq(products.id, productId))
  if (!product?.photoKey) return
  await db.update(products).set({ photoKey: null, updatedAt: new Date() }).where(eq(products.id, productId))
  await removePublicImage(PRODUCT_BUCKET, product.photoKey)
}

/** Only a product nobody ever ordered can be deleted; otherwise hide it. */
export async function deleteProduct(productId: string) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(orderItems).where(eq(orderItems.productId, productId))
  if (n > 0) throw new ProductError('Bánh này đã có người đặt, nên chỉ ẩn được thôi (tắt "Đang bán").')
  const [product] = await db.select({ photoKey: products.photoKey }).from(products).where(eq(products.id, productId))
  await db.delete(products).where(eq(products.id, productId))
  await removePublicImage(PRODUCT_BUCKET, product?.photoKey ?? null)
}
