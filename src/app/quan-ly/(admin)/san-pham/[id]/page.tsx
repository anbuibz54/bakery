import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { SectionTitle } from '@/components/ui'
import { getProductAdmin } from '@/server/catalog/admin'
import { listCategories } from '@/server/catalog/categories'
import { searchRecipes } from '@/server/costing/ingredients'
import { ProductForm } from '../product-form'
import { DangerZone, OptionsEditor, PhotoForm } from './product-extras'

export const metadata: Metadata = { title: 'Sửa bánh', robots: { index: false } }

export default async function EditProductPage({ params, searchParams }: PageProps<'/quan-ly/san-pham/[id]'>) {
  await connection()
  const [{ id }, { moi }] = await Promise.all([params, searchParams])
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const [product, categories, recipes] = await Promise.all([getProductAdmin(id), listCategories(true), searchRecipes('')])
  if (!product) notFound()

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <SectionTitle>{product.name}</SectionTitle>
        <div className="flex gap-3 text-sm font-bold">
          <Link href="/quan-ly/san-pham" className="text-muted">
            ← Tất cả bánh
          </Link>
          <Link href={`/quan-ly/gia-von/${product.slug}`} className="text-berry">
            Giá vốn
          </Link>
          {product.isActive && (
            <Link href={`/banh/${product.slug}`} className="text-berry" target="_blank">
              Xem trên cửa hàng ↗
            </Link>
          )}
        </div>
      </div>
      {moi === '1' && (
        <p className="mt-2 rounded-2xl bg-mint px-4 py-3 text-sm font-bold text-mint-ink">
          Đã tạo. Bánh đang ẩn — thêm ảnh, size rồi bật &quot;Đang bán&quot; là khách thấy.
        </p>
      )}

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
        <ProductForm
          categories={categories}
          recipes={recipes}
          product={{
            id: product.id,
            name: product.name,
            category: product.category,
            summary: product.summary ?? '',
            description: product.description ?? '',
            basePriceVnd: product.basePriceVnd,
            leadTimeHours: product.leadTimeHours,
            takesDeposit: product.takesDeposit,
            featured: product.featured,
            soldOutNote: product.soldOutNote,
            tone: product.tone,
            isActive: product.isActive,
            position: product.position,
            recipeId: product.recipeId,
          }}
        />
        <div className="flex flex-col gap-4">
          <PhotoForm productId={product.id} photoUrl={product.photoUrl} tone={product.tone} />
          <OptionsEditor
            productId={product.id}
            basePriceVnd={product.basePriceVnd}
            options={product.options.map((o) => ({ id: o.id, group: o.group, label: o.label, detail: o.detail ?? '', priceDeltaVnd: o.priceDeltaVnd }))}
          />
          <DangerZone productId={product.id} timesOrdered={product.timesOrdered} />
        </div>
      </div>
    </>
  )
}
