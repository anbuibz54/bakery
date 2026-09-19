import type { StampName } from '@/components/stamp-icon'

/**
 * Menu sections live in the `categories` table (owner-editable). This file
 * only holds what the browser and the admin form need without a query.
 */

export type Category = {
  slug: string
  title: string
  chip: string
  note: string | null
  icon: StampName
  position: number
  isActive: boolean
}

/** Stamp icons that make sense for a menu section, for the admin picker. */
export const CATEGORY_ICONS: { icon: StampName; label: string }[] = [
  { icon: 'cake', label: 'Bánh kem' },
  { icon: 'croissant', label: 'Pastry' },
  { icon: 'bowl', label: 'Bánh Việt' },
  { icon: 'lantern', label: 'Trung thu' },
  { icon: 'gift', label: 'Hộp quà' },
  { icon: 'oven', label: 'Bánh nướng' },
  { icon: 'letter', label: 'Tặng' },
  { icon: 'calendar', label: 'Theo mùa' },
]

/** "Bánh kem sinh nhật" → "banh-kem-sinh-nhat". */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
