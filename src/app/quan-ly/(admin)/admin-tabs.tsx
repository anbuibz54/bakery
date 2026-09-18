'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { StampIcon, type StampName } from '@/components/stamp-icon'

/** The four everyday screens, always within thumb reach. */
export function AdminTabs({ tabs }: { tabs: { href: string; label: string; icon: StampName; print: string }[] }) {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 px-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden" aria-label="Khu quản lý">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[26px] bg-foreground p-2 shadow-lg">
        {tabs.map((t) => {
          const active = t.href === '/quan-ly' ? pathname === t.href : pathname.startsWith(t.href)
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-[18px] py-1.5 ${active ? 'bg-pink text-foreground' : 'text-white'}`}
            >
              <StampIcon name={t.icon} size={24} print={active ? t.print : 'rgb(255 255 255 / 0.18)'} />
              <span className="text-[11px] font-bold">{t.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/** The same four screens as links, for a laptop where a thumb bar makes no sense. */
export function AdminTopNav({ tabs }: { tabs: { href: string; label: string; icon: StampName; print: string }[] }) {
  const pathname = usePathname()
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Khu quản lý">
      {tabs.map((t) => {
        const active = t.href === '/quan-ly' ? pathname === t.href : pathname.startsWith(t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${active ? 'bg-foreground text-white' : 'hover:bg-surface'}`}
          >
            <StampIcon name={t.icon} size={20} print={active ? t.print : 'rgb(58 46 57 / 0.12)'} />
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
