import Link from 'next/link'
import { connection } from 'next/server'
import { PRINT, StampIcon, type StampName } from '@/components/stamp-icon'
import { SiteFooter, SiteHeader, SitePage } from '@/components/site-chrome'
import { buttonClass, ProductArt, SectionTitle } from '@/components/ui'
import { listCategories } from '@/server/catalog/categories'
import { formatK } from '@/lib/money'
import { listMenu } from '@/server/catalog/service'
import { OccasionForm } from './occasion-form'

const OCCASIONS: { title: string; hint: string; icon: StampName; print: string; href: string }[] = [
  { title: 'Sinh nhật mẹ', hint: 'bánh kem ít ngọt', icon: 'cake', print: PRINT.pink, href: '/menu?loai=banh-kem' },
  { title: 'Người thương', hint: 'giấu giá, kèm thiệp', icon: 'letter', print: PRINT.sky, href: '/banh/kem-dau-pho-mai?qua=1' },
  { title: 'Cả văn phòng', hint: 'hộp pastry 12 cái', icon: 'croissant', print: PRINT.lemon, href: '/banh/hop-pastry-van-phong' },
  { title: 'Trung thu', hint: 'hộp quà, đặt đến 25/9', icon: 'lantern', print: PRINT.peach, href: '/menu?loai=trung-thu' },
]

export default async function HomePage() {
  await connection()
  const [menu, sections] = await Promise.all([listMenu(), listCategories()])
  const featured = menu.filter((p) => p.featured && !p.soldOutNote).slice(0, 4)
  const iconOf = (slug: string) => sections.find((c) => c.slug === slug)?.icon ?? 'cake'

  return (
    <SitePage>
      <SiteHeader />

      <section className="relative mt-1.5 overflow-hidden rounded-[32px] bg-pink px-[22px] pt-6 pb-[22px] md:grid md:grid-cols-[minmax(0,1.1fr)_auto] md:items-center md:gap-8 md:px-12 md:py-14">
        <div>
          <h1 className="max-w-[260px] font-display text-[31px] leading-[1.2] font-bold text-balance md:max-w-none md:text-5xl">
            Một chiếc bánh, một lời chúc đúng ngày.
          </h1>
          <p className="mt-2.5 mb-4 max-w-[200px] text-sm text-foreground/80 md:mb-6 md:max-w-md md:text-lg">
            Làm tại nhà theo đơn. Viết lời chúc, giấu giá, giao tận tay người nhận.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/menu" className={`${buttonClass} md:h-14 md:px-8 md:text-base`}>
              Chọn bánh để tặng
            </Link>
            <Link href="/menu?loai=pastry" className="hidden font-bold text-berry md:inline">
              Hoặc xem pastry nướng trong tuần →
            </Link>
          </div>
        </div>
        <StampIcon
          name="gift"
          size={82}
          print={PRINT.lemon}
          className="absolute right-[18px] bottom-4 rotate-[9deg] md:static md:h-40 md:w-40 md:rotate-6"
        />
      </section>

      <SectionTitle className="mt-7 mb-3 md:mt-12 md:text-3xl">Hôm nay tặng ai?</SectionTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {OCCASIONS.map((o) => (
          <Link
            key={o.title}
            href={o.href}
            className="rounded-3xl bg-surface p-4 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-berry md:p-6"
          >
            <StampIcon name={o.icon} size={48} print={o.print} />
            <div className="mt-2 font-bold md:text-lg">{o.title}</div>
            <div className="text-xs text-muted md:text-sm">{o.hint}</div>
          </Link>
        ))}
      </div>

      {featured.length > 0 && (
        <>
          <div className="mt-7 mb-3 flex items-baseline justify-between md:mt-12">
            <SectionTitle className="md:text-3xl">Bánh được yêu nhất</SectionTitle>
            <Link href="/menu" className="text-[13px] font-bold text-berry md:text-base">
              Xem menu
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {featured.map((p, i) => (
              <Link
                key={p.id}
                href={`/banh/${p.slug}`}
                className="overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-berry"
              >
                <ProductArt tone={p.tone} icon={iconOf(p.category)} photoUrl={p.photoUrl} alt={p.name} className="h-[140px] w-full md:h-52" size={56} />
                <div className="px-3 pt-2.5 pb-3 md:px-4 md:pb-4">
                  <div className="leading-tight font-bold md:text-lg">{p.name}</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[13px] text-muted md:text-sm">
                      {p.hasOptions ? `từ ${formatK(p.basePriceVnd)}` : formatK(p.basePriceVnd)}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex size-[30px] flex-none items-center justify-center rounded-full font-bold ${i === 0 ? 'bg-berry text-white' : 'bg-blush text-berry'}`}
                    >
                      +
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="mt-[26px] grid gap-4 md:mt-12 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-start">
        <OccasionForm />
        {/* Swap for a real customer quote (with their permission) once there is one. */}
        <section className="grid grid-cols-[44px_minmax(0,1fr)] items-start gap-3 rounded-3xl bg-surface p-4 shadow-[var(--shadow-soft)] md:p-6">
          <StampIcon name="camera" size={40} print={PRINT.pink} />
          <div>
            <p className="text-sm md:text-base">
              Bánh nào cũng được chụp lại trước khi rời bếp. Bạn xem ảnh chiếc bánh thật của mình ngay trên trang theo dõi đơn.
            </p>
            <p className="mt-1 text-xs text-muted">lời hứa của tiệm</p>
          </div>
        </section>
      </div>

      <SiteFooter />
    </SitePage>
  )
}
