/**
 * Public images in Supabase Storage: product photos (and the brand logo lives
 * in its own bucket, see brand/service.ts). Public on purpose — a menu photo is
 * meant to be seen, and a public URL is cacheable by the browser and CDN.
 *
 * Every upload is a new file name, so a changed photo never shows stale from
 * cache. PNG / JPEG / WebP only: SVG can carry script.
 *
 * No `next/*` imports.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const PRODUCT_BUCKET = 'bakery-products'
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024

export class ImageError extends Error {}

let client: SupabaseClient | undefined
function storage() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })
  return client.storage
}

const ready = new Set<string>()
async function ensureBucket(bucket: string) {
  if (ready.has(bucket)) return
  const { data } = await storage().getBucket(bucket)
  if (!data) {
    const { error } = await storage().createBucket(bucket, { public: true, fileSizeLimit: IMAGE_MAX_BYTES, allowedMimeTypes: [...IMAGE_TYPES] })
    if (error && !/already exists/i.test(error.message)) throw error
  }
  ready.add(bucket)
}

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }

export async function uploadPublicImage(bucket: string, folder: string, file: Blob): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) throw new ImageError('Ảnh phải là JPG, PNG hoặc WebP.')
  if (file.size > IMAGE_MAX_BYTES) throw new ImageError('Ảnh lớn quá 4 MB.')
  await ensureBucket(bucket)
  const path = `${folder}/${crypto.randomUUID()}.${EXT[file.type]}`
  const { error } = await storage().from(bucket).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}

/** Best effort: a leftover file costs little, a failed delete must not block the owner. */
export async function removePublicImage(bucket: string, path: string | null) {
  if (!path) return
  await storage().from(bucket).remove([path]).catch(() => undefined)
}

export function publicImageUrl(bucket: string, path: string | null): string | null {
  if (!path) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`
}
