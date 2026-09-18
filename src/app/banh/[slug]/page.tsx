import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { SiteFooter, SiteHeader, SitePage } from '@/components/site-chrome'
import { BackLink, ProductArt } from '@/components/ui'
import { category } from '@/lib/catalog'
import { getProduct } from '@/server/catalog/service'
import { bookingCalendar } from '@/server/schedule/service'
import { CakeBuilder } from './cake-builder'

export async function generateMetadata({ params }: PageProps<'/banh/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  return { title: product?.name, description: product?.summary ?? undefined }
}

export default async function ProductPage({ params, searchParams }: PageProps<'/banh/[slug]'>) {
  await connection()
  const [{ slug }, { qua }] = await Promise.all([params, searchParams])
  const [product, calendar] = await Promise.all([getProduct(slug), bookingCalendar()])
  if (!product) notFound()
  const cat = category(product.category)

  return (
    <SitePage className="pb-32 lg:pb-10">
      <div className="hidden md:block">
        <SiteHeader />
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:items-start lg:gap-10">
        <div className="lg:sticky lg:top-24">
          <div className="relative -mx-2 mt-3 md:mx-0">
            <ProductArt tone={product.tone} icon={cat?.icon ?? 'cake'} className="h-[290px] rounded-[32px] lg:h-[420px]" size={96} />
            <div className="absolute top-3.5 left-3.5 md:hidden">
              <BackLink href={`/menu?loai=${product.category}`} />
            </div>
          </div>
          <div className="pt-5">
            <h1 className="font-display text-[28px] leading-tight font-bold text-balance lg:text-4xl">{product.name}</h1>
            {product.description && <p className="mt-1.5 text-foreground/80 lg:text-lg">{product.description}</p>}
          </div>
        </div>

        <div className="lg:pt-3">
          {product.soldOutNote ? (
            <p className="mt-5 rounded-3xl bg-line/70 px-4 py-3 text-muted">
              <b>Tạm hết.</b> {product.soldOutNote}
            </p>
          ) : (
            <CakeBuilder product={product} calendar={calendar} startAsGift={qua === '1'} />
          )}
        </div>
      </div>

      <SiteFooter />
    </SitePage>
  )
}
