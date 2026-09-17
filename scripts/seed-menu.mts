/**
 * The starting menu, from the approved mockup. Idempotent: upserts products by
 * slug and replaces their options.   pnpm menu:seed
 *
 * Prices and dishes are the mockup's — the owner edits them later (admin,
 * build order step 5). Running this again overwrites edits to these slugs.
 */
import { eq } from 'drizzle-orm'
import { db } from '../src/server/db/index.ts'
import { productOptions, products } from '../src/server/db/schema.ts'

type Opt = { group: string; label: string; detail?: string; delta?: number }
type Seed = {
  slug: string
  name: string
  category: string
  summary: string
  description: string
  price: number
  lead: number
  deposit?: boolean
  featured?: boolean
  soldOut?: string
  tone: string
  recipeId?: string
  options?: Opt[]
}

const cakeSizes: Opt[] = [
  { group: 'size', label: '4–6 người', detail: '14cm' },
  { group: 'size', label: '8–10 người', detail: '18cm', delta: 100_000 },
  { group: 'size', label: '12–15 người', detail: '22cm', delta: 240_000 },
]

const MENU: Seed[] = [
  {
    slug: 'kem-dau-pho-mai', name: 'Kem dâu phô mai', category: 'banh-kem',
    summary: 'Kem phô mai ít ngọt, dâu Đà Lạt',
    description: 'Cốt vani mềm, kem phô mai ít ngọt, dâu Đà Lạt. Hợp tặng mẹ, tặng người không thích ngọt gắt.',
    price: 320_000, lead: 48, deposit: true, featured: true, tone: '#F6C1D4',
    options: [...cakeSizes, { group: 'Cốt bánh', label: 'Vani' }, { group: 'Cốt bánh', label: 'Socola' }, { group: 'Cốt bánh', label: 'Trà xanh', delta: 20_000 }],
  },
  {
    slug: 'tiramisu-ca-phe', name: 'Tiramisu cà phê Buôn Ma Thuột', category: 'banh-kem',
    summary: 'Mascarpone, cà phê phin, cacao',
    description: 'Mascarpone đánh bông, bánh ladyfinger nhúng cà phê phin Buôn Ma Thuột, rắc cacao nguyên chất. Vị đắng nhẹ cho người lớn.',
    price: 380_000, lead: 48, deposit: true, tone: '#E8D3B9', options: cakeSizes,
  },
  {
    slug: 'kem-tra-xanh-dau-do', name: 'Kem trà xanh đậu đỏ', category: 'banh-kem',
    summary: 'Matcha Nhật, đậu đỏ sên nhà làm',
    description: 'Cốt trà xanh, kem matcha Nhật, đậu đỏ sên tại nhà. Ngọt vừa, thơm trà.',
    price: 360_000, lead: 48, deposit: true, tone: '#D5EFE3', options: cakeSizes,
  },
  {
    slug: 'kem-xoai-chanh-day', name: 'Bánh kem xoài chanh dây', category: 'banh-kem',
    summary: 'Mousse xoài cát, sốt chanh dây',
    description: 'Mousse xoài cát Hòa Lộc, sốt chanh dây chua nhẹ.',
    price: 340_000, lead: 48, deposit: true, tone: '#FFF0B3', soldOut: 'Hết mùa xoài, quay lại tháng 4', options: cakeSizes,
  },
  {
    slug: 'banh-tao-ngan-lop', name: 'Bánh táo ngàn lớp', category: 'pastry',
    summary: 'Hộp 4 cái · vỏ tự cán, nhân quế',
    description: 'Vỏ ngàn lớp tự cán, nhân táo xào bơ quế. Nướng sáng ngày bạn nhận.',
    price: 140_000, lead: 24, featured: true, tone: '#F8DDB0', recipeId: 'afae2bf8-1c94-4d1e-9d2f-93cb75e1ce3a',
  },
  {
    slug: 'croissant-bo-phap', name: 'Croissant bơ Pháp', category: 'pastry',
    summary: 'Hộp 6 cái · 27 lớp bơ',
    description: 'Bơ Pháp, ủ bột qua đêm, 27 lớp. Hâm lại 3 phút ở 170°C là giòn như mới.',
    price: 210_000, lead: 24, tone: '#F5E1B8',
  },
  {
    slug: 'hop-pastry-van-phong', name: 'Hộp pastry văn phòng', category: 'pastry',
    summary: '12 cái · táo ngàn lớp, croissant, pain au chocolat',
    description: 'Mười hai cái bánh cho cả phòng: táo ngàn lớp, croissant bơ và pain au chocolat.',
    price: 390_000, lead: 24, tone: '#FDE3EC',
  },
  {
    slug: 'bong-lan-trung-muoi', name: 'Bông lan trứng muối', category: 'banh-viet',
    summary: 'Hộp 6 cái · chà bông, sốt bơ trứng',
    description: 'Bông lan mềm, sốt bơ trứng nhà làm, chà bông và trứng muối.',
    price: 150_000, lead: 24, tone: '#FFE9A8',
  },
  {
    slug: 'flan-caramel', name: 'Flan caramel', category: 'banh-viet',
    summary: 'Hộp 6 hũ · trứng gà ta',
    description: 'Flan hấp cách thủy, trứng gà ta, caramel nấu tới màu hổ phách.',
    price: 90_000, lead: 24, tone: '#F6D49A',
  },
  {
    slug: 'hop-qua-trung-thu', name: 'Hộp quà Trung thu', category: 'trung-thu',
    summary: '4 bánh nướng + trà, kèm thiệp',
    description: 'Bốn bánh nướng nhỏ và một gói trà, hộp giấy kraft kèm thiệp viết tay.',
    price: 480_000, lead: 72, featured: false, tone: '#E4DAF5',
    options: [
      { group: 'Vị', label: 'Truyền thống', detail: 'sen, thập cẩm' },
      { group: 'Vị', label: 'Mix vị mới', detail: 'trà xanh, socola', delta: 40_000 },
    ],
  },
]

for (const [position, m] of MENU.entries()) {
  const values = {
    slug: m.slug, name: m.name, category: m.category, summary: m.summary, description: m.description,
    basePriceVnd: m.price, leadTimeHours: m.lead, takesDeposit: m.deposit ?? false, featured: m.featured ?? false,
    soldOutNote: m.soldOut ?? null, tone: m.tone, recipeId: m.recipeId ?? null, position, isActive: true,
  }
  await db.transaction(async (trx) => {
    const [p] = await trx
      .insert(products)
      .values(values)
      .onConflictDoUpdate({ target: products.slug, set: { ...values, updatedAt: new Date() } })
      .returning({ id: products.id })
    await trx.delete(productOptions).where(eq(productOptions.productId, p.id))
    if (m.options?.length) {
      await trx.insert(productOptions).values(
        m.options.map((o, i) => ({ productId: p.id, group: o.group, label: o.label, detail: o.detail ?? null, priceDeltaVnd: o.delta ?? 0, position: i })),
      )
    }
  })
  console.log('✓', m.name)
}
process.exit(0)
