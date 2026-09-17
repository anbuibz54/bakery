import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { BackLink, ProductArt } from '@/components/ui'
import { category } from '@/lib/catalog'
import { getProduct } from '@/server/catalog/service'
import { bookingCalendar } from '@/server/schedule/service'
import { CakeBuilder } from './cake-builder'

export async function generateMetadata({ params }: PageProps<'/banh/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  return { title: product ? `${product.name} · Vibe Bánh` : 'Vibe Bánh', description: product?.summary ?? undefined }
}

export default async function ProductPage({ params, searchParams }: PageProps<'/banh/[slug]'>) {
  await connection()
  const [{ slug }, { qua }] = await Promise.all([params, searchParams])
  const [product, calendar] = await Promise.all([getProduct(slug), bookingCalendar()])
  if (!product) notFound()
  const cat = category(product.category)

  return (
    <main className="mx-auto w-full max-w-md pb-32">
      <div className="relative mx-3 mt-3">
        <ProductArt tone={product.tone} icon={cat?.icon ?? 'cake'} className="h-[290px] rounded-[32px]" size={96} />
        <div className="absolute top-3.5 left-3.5">
          <BackLink href={`/menu?loai=${product.category}`} />
        </div>
      </div>

      <div className="px-5 pt-5">
        <h1 className="font-display text-[28px] leading-tight font-bold text-balance">{product.name}</h1>
        {product.description && <p className="mt-1.5 text-[#5E4B5C]">{product.description}</p>}
      </div>

      {product.soldOutNote ? (
        <p className="mx-5 mt-5 rounded-3xl bg-[#F4EEF2] px-4 py-3 text-[#8F818D]">
          <b>Tạm hết.</b> {product.soldOutNote}
        </p>
      ) : (
        <CakeBuilder product={product} calendar={calendar} startAsGift={qua === '1'} />
      )}
    </main>
  )
}
