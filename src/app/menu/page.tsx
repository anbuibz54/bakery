import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { CartButton } from '@/components/cart-button'
import { PRINT, StampIcon } from '@/components/stamp-icon'
import { ProductArt, TitleBar } from '@/components/ui'
import { dayState } from '@/lib/availability'
import { CATEGORIES } from '@/lib/catalog'
import { inlineDay } from '@/lib/dates'
import { formatVnd } from '@/lib/money'
import { listMenu } from '@/server/catalog/service'
import { bookingCalendar } from '@/server/schedule/service'

export const metadata: Metadata = { title: 'Menu · Vibe Bánh' }

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
    <main className="mx-auto w-full max-w-md px-5 pb-10">
      <TitleBar back="/" title="Menu" right={<CartButton />} />

      <nav aria-label="Loại bánh" className="-mx-5 flex gap-2 overflow-x-auto px-5 pt-1 pb-2">
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
        <section key={s.slug} className="mt-5">
          <h2 className="font-display text-xl leading-tight font-bold">{s.title}</h2>
          <p className="mt-1 mb-3 text-[13px] text-muted">
            {s.note}
            {s.earliest && (
              <>
                {' · '}sớm nhất nhận <b className="text-foreground">{inlineDay(s.earliest.date)}</b>
              </>
            )}
          </p>
          <ul className="flex flex-col gap-3">
            {s.items.map((p) => (
              <li key={p.id}>
                {p.soldOutNote ? (
                  <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 rounded-[22px] bg-[#F4EEF2] p-2.5">
                    <div className="h-[92px] rounded-2xl bg-[#EAE2E8]" aria-hidden="true" />
                    <div className="flex min-w-0 flex-col justify-center">
                      <div className="leading-tight font-bold text-[#8F818D]">{p.name}</div>
                      <div className="text-[13px] text-[#A597A3]">{p.soldOutNote}</div>
                      <div className="mt-1 text-xs font-bold text-[#A597A3]">Tạm hết</div>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/banh/${p.slug}`}
                    className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 rounded-[22px] bg-surface p-2.5 shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-berry"
                  >
                    <ProductArt tone={p.tone} icon={s.icon} className="h-[92px] rounded-2xl" size={40} />
                    <div className="flex min-w-0 flex-col justify-between py-0.5">
                      <div>
                        <div className="leading-tight font-bold">{p.name}</div>
                        {p.summary && <div className="text-[13px] text-muted">{p.summary}</div>}
                      </div>
                      <div className="flex items-center justify-between gap-2">
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
    </main>
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
