/**
 * Menu sections. Read on most storefront pages (a handful of rows), cached per
 * request.
 *
 * No `next/*` imports.
 */

import { cache } from 'react'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { categories, products } from '../db/schema'
import { CATEGORY_ICONS, slugify, type Category } from '../../lib/catalog'
import type { StampName } from '../../components/stamp-icon'

export class CategoryError extends Error {}

const ICONS = new Set<string>(CATEGORY_ICONS.map((i) => i.icon))

function toCategory(row: typeof categories.$inferSelect): Category {
  return { ...row, icon: (ICONS.has(row.icon) ? row.icon : 'cake') as StampName }
}

/** All sections in menu order; hidden ones only when asked (admin). */
export const listCategories = cache(async function listCategories(includeHidden = false): Promise<Category[]> {
  const rows = await db.select().from(categories).orderBy(asc(categories.position), asc(categories.title))
  return rows.filter((r) => includeHidden || r.isActive).map(toCategory)
})

const input = z.object({
  /** Absent = a new section; the slug is made from the title. */
  slug: z.string().optional(),
  title: z.string().trim().min(1, 'Loại bánh cần một cái tên.').max(60),
  chip: z.string().trim().max(24).optional(),
  note: z.string().trim().max(160).optional(),
  icon: z.string().refine((v) => ICONS.has(v), 'Chọn một biểu tượng.'),
  position: z.number().int().min(0).max(99),
  isActive: z.boolean(),
})

export async function saveCategory(raw: z.input<typeof input>) {
  const parsed = input.safeParse(raw)
  if (!parsed.success) throw new CategoryError(parsed.error.issues[0]?.message ?? 'Thông tin chưa hợp lệ.')
  const c = parsed.data
  const values = { title: c.title, chip: c.chip || c.title, note: c.note || null, icon: c.icon, position: c.position, isActive: c.isActive }

  if (c.slug) {
    await db.update(categories).set(values).where(eq(categories.slug, c.slug))
    return c.slug
  }
  // The slug is permanent (products point at it), so make a fresh one unique.
  const base = slugify(c.title) || 'loai'
  const taken = new Set((await db.select({ slug: categories.slug }).from(categories)).map((r) => r.slug))
  let slug = base
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`
  await db.insert(categories).values({ slug, ...values })
  return slug
}

/** Only an empty section can go; otherwise hide it. */
export async function deleteCategory(slug: string) {
  const [used] = await db.select({ id: products.id }).from(products).where(eq(products.category, slug)).limit(1)
  if (used) throw new CategoryError('Loại này còn bánh. Chuyển bánh sang loại khác, hoặc tắt "đang hiện" để ẩn.')
  await db.delete(categories).where(eq(categories.slug, slug))
}
