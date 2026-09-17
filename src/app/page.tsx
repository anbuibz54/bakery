import Link from 'next/link'
import { connection } from 'next/server'
import { CartButton } from '@/components/cart-button'
import { SocialLinks } from '@/components/social-links'
import { PRINT, StampIcon, type StampName } from '@/components/stamp-icon'
import { buttonClass, ProductArt, SectionTitle } from '@/components/ui'
import { category } from '@/lib/catalog'
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
  const featured = (await listMenu()).filter((p) => p.featured && !p.soldOutNote).slice(0, 4)

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-10">
      <header className="flex items-center justify-between py-3.5">
        <span className="font-display text-[22px] font-bold text-berry">vibe bánh</span>
        <CartButton />
      </header>

      <section className="relative mt-1.5 overflow-hidden rounded-[32px] bg-pink px-[22px] pt-6 pb-[22px]">
        <h1 className="max-w-[260px] font-display text-[31px] leading-[1.2] font-bold">Một chiếc bánh, một lời chúc đúng ngày.</h1>
        <p className="mt-2.5 mb-4 max-w-[200px] text-sm text-[#5E4B5C]">Làm tại nhà theo đơn. Viết lời chúc, giấu giá, giao tận tay người nhận.</p>
        <Link href="/menu" className={buttonClass}>
          Chọn bánh để tặng
        </Link>
        <StampIcon name="gift" size={82} print={PRINT.lemon} className="absolute right-[18px] bottom-4 rotate-[9deg]" />
      </section>

      <SectionTitle className="mt-7 mb-3">Hôm nay tặng ai?</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {OCCASIONS.map((o) => (
          <Link key={o.title} href={o.href} className="rounded-3xl bg-surface p-4 shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-berry">
            <StampIcon name={o.icon} size={48} print={o.print} />
            <div className="mt-2 font-bold">{o.title}</div>
            <div className="text-xs text-muted">{o.hint}</div>
          </Link>
        ))}
      </div>

      {featured.length > 0 && (
        <>
          <div className="mt-7 mb-3 flex items-baseline justify-between">
            <SectionTitle>Bánh được yêu nhất</SectionTitle>
            <Link href="/menu" className="text-[13px] font-bold text-berry">
              Xem menu
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {featured.map((p, i) => (
              <Link key={p.id} href={`/banh/${p.slug}`} className="overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-berry">
                <ProductArt tone={p.tone} icon={category(p.category)?.icon ?? 'cake'} className="h-[140px]" size={56} />
                <div className="px-3 pt-2.5 pb-3">
                  <div className="leading-tight font-bold">{p.name}</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[13px] text-muted">
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

      <div className="mt-[26px]">
        <OccasionForm />
      </div>

      {/* Swap for a real customer quote (with their permission) once there is one. */}
      <section className="mt-6 grid grid-cols-[44px_minmax(0,1fr)] items-start gap-3 rounded-3xl bg-surface p-4 shadow-[var(--shadow-soft)]">
        <StampIcon name="camera" size={40} print={PRINT.pink} />
        <div>
          <p className="text-sm">Bánh nào cũng được chụp lại trước khi rời bếp. Bạn xem ảnh chiếc bánh thật của mình ngay trên trang theo dõi đơn.</p>
          <p className="mt-1 text-xs text-muted">lời hứa của tiệm</p>
        </div>
      </section>

      <section className="mt-8 text-center">
        <SectionTitle className="text-xl">Ghé tiệm trên mạng</SectionTitle>
        <p className="mt-1 mb-3 text-sm text-muted">Bánh mới mỗi tuần, hỏi gì cứ nhắn.</p>
        <SocialLinks withAction />
      </section>
    </main>
  )
}
