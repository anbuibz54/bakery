import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { buttonClass, Card, ProductArt, SectionTitle } from '@/components/ui'
import { formatVnd } from '@/lib/money'
import { listProductsAdmin } from '@/server/catalog/admin'
import { listCategories } from '@/server/catalog/categories'
import { CategoryManager } from './category-manager'

export const metadata: Metadata = { title: 'Sản phẩm', robots: { index: false } }

export default async function ProductsPage() {
  await connection()
  const [items, categories] = await Promise.all([listProductsAdmin(), listCategories(true)])
  const known = new Set(categories.map((c) => c.slug))
  const orphans = items.filter((p) => !known.has(p.category))

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>Sản phẩm</SectionTitle>
        <Link href="/quan-ly/san-pham/moi" className={buttonClass}>
          Thêm bánh
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        {items.length} món · {items.filter((p) => p.isActive).length} đang bán. Bấm vào một món để sửa giá, ảnh, size và các lựa chọn.
      </p>

      <div className="mt-4 flex flex-col gap-6">
        {[...categories.map((c) => ({ key: c.slug, title: c.title, hidden: !c.isActive, icon: c.icon })), ...(orphans.length ? [{ key: '__none', title: 'Chưa có loại', hidden: true, icon: 'cake' as const }] : [])].map((section) => {
          const list = section.key === '__none' ? orphans : items.filter((p) => p.category === section.key)
          return (
            <section key={section.key}>
              <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
                {section.title}
                {section.hidden && <span className="rounded-full bg-line px-2 py-0.5 font-sans text-xs text-muted">đang ẩn</span>}
                <span className="font-sans text-sm font-normal text-muted">{list.length}</span>
              </h2>
              {list.length === 0 ? (
                <p className="text-sm text-muted">Chưa có bánh nào.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((p) => (
                    <li key={p.id}>
                      <Link href={`/quan-ly/san-pham/${p.id}`} className="block">
                        <Card className={`grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 p-3 ${p.isActive ? '' : 'opacity-60'}`}>
                          <ProductArt tone={p.tone} icon={section.icon} photoUrl={p.photoUrl} alt="" className="size-16 rounded-2xl" size={28} />
                          <div className="min-w-0">
                            <div className="truncate font-bold">{p.name}</div>
                            <div className="text-sm text-muted tabular-nums">{formatVnd(p.basePriceVnd)}</div>
                            <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-bold">
                              {!p.isActive && <span className="rounded-full bg-line px-2 py-0.5 text-muted">ẩn</span>}
                              {p.soldOutNote && <span className="rounded-full bg-lemon px-2 py-0.5">tạm hết</span>}
                              {p.featured && <span className="rounded-full bg-blush px-2 py-0.5 text-berry">nổi bật</span>}
                              {p.recipeId && <span className="rounded-full bg-mint px-2 py-0.5 text-mint-ink">có công thức</span>}
                              {!p.photoUrl && <span className="rounded-full bg-sky px-2 py-0.5">chưa có ảnh</span>}
                            </div>
                          </div>
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      <SectionTitle className="mt-8 text-xl">Loại bánh</SectionTitle>
      <p className="mt-1 text-sm text-muted">Các nhóm trên menu và thanh đầu trang. Thứ tự nhỏ đứng trước.</p>
      <CategoryManager categories={categories} />
    </>
  )
}
