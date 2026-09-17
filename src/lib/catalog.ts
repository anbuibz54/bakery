/** Menu categories, in menu order. `products.category` holds the slug. */
export const CATEGORIES = [
  {
    slug: 'banh-kem',
    chip: 'Bánh kem',
    title: 'Bánh kem sinh nhật',
    note: 'Đặt trước 2 ngày · cọc 50% · viết chữ miễn phí',
    icon: 'cake',
  },
  {
    slug: 'pastry',
    chip: 'Pastry',
    title: 'Pastry & ngàn lớp',
    note: 'Nướng theo mẻ, đặt trước 1 ngày',
    icon: 'croissant',
  },
  {
    slug: 'banh-viet',
    chip: 'Bánh Việt',
    title: 'Bánh Việt, fusion',
    note: 'Đặt trước 1 ngày',
    icon: 'bowl',
  },
  {
    slug: 'trung-thu',
    chip: 'Trung thu',
    title: 'Hộp quà Trung thu',
    note: 'Nhận đặt đến 25/9 · đặt trước 3 ngày',
    icon: 'lantern',
  },
] as const

export type CategorySlug = (typeof CATEGORIES)[number]['slug']

export function category(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug)
}
