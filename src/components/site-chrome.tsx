import Link from 'next/link'
import { CartButton } from './cart-button'
import { SocialLinks } from './social-links'
import { PRINT, StampIcon } from './stamp-icon'
import { CATEGORIES } from '@/lib/catalog'
import { PICKUP_ADDRESS, SLOTS } from '@/lib/shop'
import { getBrand, logoUrl } from '@/server/brand/service'

/**
 * The storefront's frame. On a phone it is the same slim bar as before; from
 * `md` up it grows a real menu, because a bakery link shared on Facebook gets
 * opened on desktops too.
 */
export async function SiteHeader({ active }: { active?: 'menu' } = {}) {
  const brand = await getBrand()
  const logo = logoUrl(brand.logoPath)
  return (
    <header className="sticky top-0 z-20 -mx-5 mb-1 bg-background/85 px-5 backdrop-blur md:-mx-8 md:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 py-3.5">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-display text-[22px] font-bold text-berry" aria-label={`${brand.name}, trang chủ`}>
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded logo from Storage
            <img src={logo} alt="" width={36} height={36} className="size-9 flex-none rounded-xl object-contain" />
          )}
          <span className="truncate">{brand.wordmark}</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Menu bánh">
          <Link
            href="/menu"
            className={`rounded-full px-4 py-2 text-sm font-bold ${active === 'menu' ? 'bg-foreground text-white' : 'hover:bg-surface'}`}
          >
            Tất cả bánh
          </Link>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/menu?loai=${c.slug}`} className="rounded-full px-4 py-2 text-sm hover:bg-surface">
              {c.chip}
            </Link>
          ))}
        </nav>
        <CartButton />
      </div>
    </header>
  )
}

export async function SiteFooter() {
  const brand = await getBrand()
  return (
    <footer className="mt-12 -mx-5 bg-surface px-5 py-8 md:-mx-8 md:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold text-berry">{brand.name}</p>
          <p className="mt-1 text-sm text-muted">{brand.tagline}</p>
          <div className="mt-3">
            <SocialLinks className="justify-start" />
          </div>
        </div>
        <div className="text-sm">
          <p className="flex items-center gap-2 font-bold">
            <StampIcon name="house" size={22} print={PRINT.pink} />
            Tự đến lấy
          </p>
          <p className="mt-1 text-muted">{PICKUP_ADDRESS}</p>
          <p className="mt-3 flex items-center gap-2 font-bold">
            <StampIcon name="scooter" size={22} print={PRINT.sky} />
            Giao tận nơi
          </p>
          <p className="mt-1 text-muted">Trong TP.HCM, phí theo khu vực, báo trước khi đặt.</p>
        </div>
        <div className="text-sm">
          <p className="flex items-center gap-2 font-bold">
            <StampIcon name="calendar" size={22} print={PRINT.lemon} />
            Khung giờ nhận
          </p>
          <ul className="mt-1 text-muted">
            {SLOTS.map((s) => (
              <li key={s.id}>{s.label}</li>
            ))}
          </ul>
          <p className="mt-3 text-muted">Bánh kem đặt trước 2 ngày · cọc 50% giữ lịch nướng.</p>
        </div>
      </div>
    </footer>
  )
}

/** Page shell: phone-width by default, roomy from `md` up. */
export function SitePage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={`mx-auto w-full max-w-md px-5 pb-10 md:max-w-6xl md:px-8 ${className ?? ''}`}>{children}</main>
}
