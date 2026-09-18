/**
 * The shop's name, logo, colours and social links, as the owner set them.
 *
 * Read on every storefront render (one tiny row), so a change in the admin
 * shows up on the next page load without a redeploy.
 *
 * No `next/*` imports.
 */

import { cache } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { brandSettings } from '../db/schema'
import {
  BRAND_TOKENS,
  DEFAULT_NAME,
  DEFAULT_TAGLINE,
  DEFAULT_WORDMARK,
  completePalette,
  readabilityChecks,
  type Palette,
  type PublicBrand,
} from '../../lib/brand'

export class BrandError extends Error {}

export const LOGO_BUCKET = 'bakery-brand'
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
const LOGO_MAX_BYTES = 1024 * 1024

export type Brand = {
  name: string
  wordmark: string
  tagline: string
  logoPath: string | null
  palette: Palette
  instagramUrl: string | null
  facebookUrl: string | null
  tiktokUrl: string | null
}

/**
 * Links the shop started with, kept as defaults so a fresh database still
 * shows them. The owner can change or clear them in the admin.
 */
const DEFAULT_LINKS = {
  instagramUrl: 'https://ig.me/m/alordoflove',
  facebookUrl: 'https://m.me/khanh.an.bui.oan',
  tiktokUrl: null,
}

/** Memoised per request: the layout, header, footer and metadata all ask. */
export const getBrand = cache(async function getBrand(): Promise<Brand> {
  const [row] = await db.select().from(brandSettings).where(eq(brandSettings.id, 'shop'))
  if (!row) {
    return { name: DEFAULT_NAME, wordmark: DEFAULT_WORDMARK, tagline: DEFAULT_TAGLINE, logoPath: null, palette: completePalette({}), ...DEFAULT_LINKS }
  }
  return {
    name: row.name,
    wordmark: row.wordmark,
    tagline: row.tagline ?? DEFAULT_TAGLINE,
    logoPath: row.logoPath,
    palette: completePalette(row.palette),
    instagramUrl: row.instagramUrl,
    facebookUrl: row.facebookUrl,
    tiktokUrl: row.tiktokUrl,
  }
})

export function logoUrl(path: string | null): string | null {
  if (!path) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${LOGO_BUCKET}/${path}`
}

/** What the browser is allowed to know: no storage paths, just ready-to-use values. */
export function publicBrand(b: Brand): PublicBrand {
  const socials: PublicBrand['socials'] = []
  if (b.instagramUrl) socials.push({ id: 'instagram', label: 'Instagram', action: 'nhắn DM', url: b.instagramUrl })
  if (b.facebookUrl) socials.push({ id: 'facebook', label: 'Facebook', action: 'Messenger', url: b.facebookUrl })
  if (b.tiktokUrl) socials.push({ id: 'tiktok', label: 'TikTok', action: 'xem bánh mới', url: b.tiktokUrl })
  return { name: b.name, wordmark: b.wordmark, tagline: b.tagline, logoUrl: logoUrl(b.logoPath), socials }
}

const url = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https:\/\/[^\s]+$/.test(v), 'Link phải bắt đầu bằng https://')

const brandInput = z.object({
  name: z.string().trim().min(1, 'Tiệm cần một cái tên.').max(60),
  wordmark: z.string().trim().min(1).max(40),
  tagline: z.string().trim().max(160),
  palette: z.record(z.string(), z.string()),
  instagramUrl: url,
  facebookUrl: url,
  tiktokUrl: url,
})

export async function saveBrand(raw: z.input<typeof brandInput>) {
  const parsed = brandInput.safeParse(raw)
  if (!parsed.success) throw new BrandError(parsed.error.issues[0]?.message ?? 'Thông tin chưa hợp lệ.')
  const input = parsed.data

  const palette = completePalette(input.palette)
  const failing = readabilityChecks(palette).filter((c) => c.blocking && c.ratio < c.min)
  if (failing.length) {
    throw new BrandError(`Màu khó đọc: ${failing.map((c) => c.label.toLowerCase()).join(', ')}. Chọn màu đậm hơn hoặc nhạt hơn một chút.`)
  }

  const values = {
    name: input.name,
    wordmark: input.wordmark,
    tagline: input.tagline || null,
    palette: Object.fromEntries(BRAND_TOKENS.map(({ key }) => [key, palette[key]])),
    instagramUrl: input.instagramUrl || null,
    facebookUrl: input.facebookUrl || null,
    tiktokUrl: input.tiktokUrl || null,
    updatedAt: new Date(),
  }
  await db
    .insert(brandSettings)
    .values({ id: 'shop', ...values })
    .onConflictDoUpdate({ target: brandSettings.id, set: values })
}

/* -------------------------------------------------------------------------- */
/* Logo                                                                        */
/* -------------------------------------------------------------------------- */

let client: SupabaseClient | undefined
function storage() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
  return client.storage
}

/** Public bucket, created on first use. A logo is meant to be seen. */
async function ensureBucket() {
  const { data } = await storage().getBucket(LOGO_BUCKET)
  if (data) return
  const { error } = await storage().createBucket(LOGO_BUCKET, { public: true, fileSizeLimit: LOGO_MAX_BYTES, allowedMimeTypes: [...LOGO_TYPES] })
  if (error && !/already exists/i.test(error.message)) throw error
}

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

/**
 * Store a new logo and point the brand at it. SVG is refused on purpose: an
 * uploaded SVG can carry script. A new file each time, so browsers never show
 * a cached old logo.
 */
export async function uploadLogo(file: Blob) {
  if (!LOGO_TYPES.includes(file.type as (typeof LOGO_TYPES)[number])) throw new BrandError('Logo phải là PNG, JPG hoặc WebP.')
  if (file.size > LOGO_MAX_BYTES) throw new BrandError('Logo lớn quá 1 MB.')
  await ensureBucket()

  const path = `logo-${crypto.randomUUID()}.${EXT[file.type]}`
  const { error } = await storage().from(LOGO_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error

  const current = await getBrand()
  await db
    .insert(brandSettings)
    .values({ id: 'shop', name: current.name, wordmark: current.wordmark, tagline: current.tagline, palette: current.palette, logoPath: path, instagramUrl: current.instagramUrl, facebookUrl: current.facebookUrl, tiktokUrl: current.tiktokUrl })
    .onConflictDoUpdate({ target: brandSettings.id, set: { logoPath: path, updatedAt: new Date() } })

  if (current.logoPath) await storage().from(LOGO_BUCKET).remove([current.logoPath])
  return logoUrl(path)
}

export async function removeLogo() {
  const current = await getBrand()
  if (!current.logoPath) return
  await db.update(brandSettings).set({ logoPath: null, updatedAt: new Date() }).where(eq(brandSettings.id, 'shop'))
  await storage().from(LOGO_BUCKET).remove([current.logoPath])
}
