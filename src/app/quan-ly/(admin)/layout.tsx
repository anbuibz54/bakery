import Link from 'next/link'
import { requireOwner } from '@/lib/auth/owner'
import { PRINT, StampIcon, type StampName } from '@/components/stamp-icon'
import { signOutAction } from '../_actions'
import { AdminTabs, AdminTopNav } from './admin-tabs'

export const TABS: { href: string; label: string; icon: StampName; print: string }[] = [
  { href: '/quan-ly', label: 'Đơn', icon: 'letter', print: PRINT.pink },
  { href: '/quan-ly/me-nuong', label: 'Mẻ nướng', icon: 'oven', print: PRINT.peach },
  { href: '/quan-ly/gia-von', label: 'Giá vốn', icon: 'cake', print: PRINT.lemon },
  { href: '/quan-ly/so-lieu', label: 'Số liệu', icon: 'check', print: PRINT.mint },
]

export default async function AdminLayout({ children }: LayoutProps<'/quan-ly'>) {
  const owner = await requireOwner()
  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-28 md:max-w-6xl md:px-8 md:pb-10">
      <header className="flex items-center justify-between gap-3 py-3.5">
        <Link href="/quan-ly" className="flex items-center gap-2">
          <StampIcon name="house" size={28} print={PRINT.pink} />
          <span className="font-display text-lg font-bold">Quản lý</span>
        </Link>
        <AdminTopNav tabs={TABS} />
        <nav className="flex items-center gap-2 text-[13px]" aria-label="Khác">
          <Link href="/quan-ly/nguyen-lieu" className="rounded-full bg-surface px-3 py-2 font-bold shadow-[var(--shadow-soft)]">
            Nguyên liệu
          </Link>
          <Link href="/quan-ly/cai-dat" className="rounded-full bg-surface px-3 py-2 font-bold shadow-[var(--shadow-soft)]">
            Cài đặt
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="rounded-full bg-surface px-3 py-2 font-bold text-muted shadow-[var(--shadow-soft)]" title={owner.email}>
              Thoát
            </button>
          </form>
        </nav>
      </header>
      {children}
      <AdminTabs tabs={TABS} />
    </div>
  )
}
