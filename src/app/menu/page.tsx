import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { PRINT, StampIcon } from '@/components/stamp-icon'
import { SiteFooter, SiteHeader, SitePage } from '@/components/site-chrome'
import { ProductArt } from '@/components/ui'
import { dayState } from '@/lib/availability'
import { CATEGORIES } from '@/lib/catalog'
import { inlineDay } from '@/lib/dates'
import { formatVnd } from '@/lib/money'
import { listMenu } from '@/server/catalog/service'
import { bookingCalendar } from '@/server/schedule/service'

export const metadata: Metadata = { title: 'Menu' }

export default async function MenuPage({ searchParams }: PageProps<'/menu'>) {
  await connection()
  const { loai } = await searchParams
  const active = CATEGORIES.find((c) => c.slug === loai)?.slug ?? null
  const [menu, calendar] = await Promise.all([listMenu(), bookingCalendar()])

  const sections = CATEGORIES.filter((c) => !active || c.slug === active)
    .map((c) => {
      const items = menu.filter((p) => p.category === c.slug)
      const lead = Math.min(...items.filter((p) => !p.soldOutNote).map((p) => p.leadTimeHours))
      const earliest = Number.isFinite(lead) ? calendar.find((d) => dayState(d, lead).kind === 'open') : undefined
      return { ...c, items, earliest }
    })
    .filter((s) => s.items.length > 0)

  return (
    <SitePage>
      <SiteHeader active="menu" />

      <h1 className="mt-2 font-display text-2xl font-bold md:text-4xl">Menu</h1>

      {/* Phone: the categories as chips. Desktop has them in the header. */}
      <nav aria-label="Loại bánh" className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-2 md:hidden">
        <Chip href="/menu" active={!active}>
          Tất cả
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.slug} href={`/menu?loai=${c.slug}`} active={active === c.slug}>
            {c.chip}
          </Chip>
        ))}
      </nav>

      {sections.map((s) => (
        <section key={s.slug} className="mt-5 md:mt-10">
          <h2 className="font-display text-xl leading-tight font-bold md:text-2xl">{s.title}</h2>
          <p className="mt-1 mb-3 text-[13px] text-muted md:text-sm">
            {s.note}
            {s.earliest && (
              <>
                {' · '}sớm nhất nhận <b className="text-foreground">{inlineDay(s.earliest.date)}</b>
              </>
            )}
          </p>
          <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {s.items.map((p) => (
              <li key={p.id}>
                {p.soldOutNote ? (
                  <div className="grid h-full grid-cols-[92px_minmax(0,1fr)] gap-3 rounded-[22px] bg-line/70 p-2.5 md:grid-cols-1 md:gap-0 md:p-0">
                    <div className="h-[92px] rounded-2xl bg-line md:h-44 md:rounded-b-none" aria-hidden="true" />
                    <div className="flex min-w-0 flex-col justify-center md:p-4">
                      <div className="leading-tight font-bold text-muted md:text-lg">{p.name}</div>
                      <div className="text-[13px] text-muted/80">{p.soldOutNote}</div>
                      <div className="mt-1 text-xs font-bold text-muted/80">Tạm hết</div>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/banh/${p.slug}`}
                    className="grid h-full grid-cols-[92px_minmax(0,1fr)] gap-3 overflow-hidden rounded-[22px] bg-surface p-2.5 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-berry md:grid-cols-1 md:gap-0 md:p-0"
                  >
                    <ProductArt tone={p.tone} icon={s.icon} className="h-[92px] rounded-2xl md:h-44 md:rounded-none" size={40} />
                    <div className="flex min-w-0 flex-col justify-between py-0.5 md:p-4">
                      <div>
                        <div className="leading-tight font-bold md:text-lg">{p.name}</div>
                        {p.summary && <div className="text-[13px] text-muted md:text-sm">{p.summary}</div>}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="font-bold tabular-nums">
                          {p.hasOptions ? 'từ ' : ''}
                          {formatVnd(p.basePriceVnd)}
                        </span>
                        {p.featured ? (
                          <span className="rounded-full bg-blush px-2.5 py-0.5 text-xs font-bold text-berry">được yêu nhất</span>
                        ) : (
                          <span aria-hidden="true" className="flex size-[30px] items-center justify-center rounded-full bg-blush font-bold text-berry">
                            +
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-[13px] text-muted">
        <StampIcon name="house" size={24} print={PRINT.mint} />
        Làm tại nhà, mỗi ngày nhận số đơn có hạn.
      </p>

      <SiteFooter />
    </SitePage>
  )
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex h-[38px] flex-none items-center rounded-full px-4 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-berry ${
        active ? 'bg-foreground font-bold text-white' : 'bg-surface shadow-[var(--shadow-soft)]'
      }`}
    >
      {children}
    </Link>
  )
}
