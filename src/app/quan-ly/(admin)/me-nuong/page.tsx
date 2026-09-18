import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { PRINT, StampIcon } from '@/components/stamp-icon'
import { Card, SectionTitle } from '@/components/ui'
import { longDay, shortDay, vnDate, vnHour } from '@/lib/dates'
import { formatK, formatVnd } from '@/lib/money'
import { slotLabelForHour } from '@/lib/shop'
import { bakeDayShopping, ordersOnDay, upcomingBakeDays } from '@/server/admin/orders'

export const metadata: Metadata = { title: 'Mẻ nướng · Vibe Bánh', robots: { index: false } }

export default async function BakeDayPage({ searchParams }: PageProps<'/quan-ly/me-nuong'>) {
  await connection()
  const { ngay } = await searchParams
  const days = await upcomingBakeDays()
  const date = typeof ngay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ngay) ? ngay : (days[0]?.date ?? vnDate())
  const [list, shopping] = await Promise.all([ordersOnDay(date), bakeDayShopping(date)])
  const totalVnd = shopping.groups.reduce((s, g) => s + g.costVnd, 0)

  return (
    <>
      <SectionTitle>Mẻ nướng</SectionTitle>
      <nav className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {days.map((d) => (
          <Link
            key={d.date}
            href={`/quan-ly/me-nuong?ngay=${d.date}`}
            aria-current={d.date === date ? 'page' : undefined}
            className={`flex h-11 flex-none items-center gap-2 rounded-full px-4 text-sm ${d.date === date ? 'bg-foreground font-bold text-white' : 'bg-surface shadow-[var(--shadow-soft)]'}`}
          >
            {shortDay(d.date)}
            <span className={`rounded-full px-2 text-xs font-bold ${d.date === date ? 'bg-white/20' : 'bg-blush text-berry'}`}>{d.count}</span>
          </Link>
        ))}
      </nav>

      <p className="mt-3 text-sm text-muted">{longDay(date)}</p>

      <Card className="mt-3">
        <h2 className="mb-2 font-bold">Cần làm</h2>
        {list.length === 0 ? (
          <p className="text-sm text-muted">Ngày này chưa có đơn.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-dashed divide-line text-sm">
            {list.flatMap((o) =>
              o.items.map((i, n) => (
                <li key={`${o.id}-${n}`} className="flex justify-between gap-3 py-2">
                  <span>
                    <b>
                      {i.productName}
                      {i.quantity > 1 && ` × ${i.quantity}`}
                    </b>
                    {i.cakeMessage && <span className="block text-muted">Chữ: &quot;{i.cakeMessage}&quot;</span>}
                  </span>
                  <span className="whitespace-nowrap text-muted">
                    {o.code} · {slotLabelForHour(vnHour(o.scheduledFor))}
                  </span>
                </li>
              )),
            )}
          </ul>
        )}
      </Card>

      <div className="mt-5 flex items-baseline justify-between gap-3">
        <SectionTitle className="text-xl">Nguyên liệu cho mẻ này</SectionTitle>
        {totalVnd > 0 && <span className="text-sm text-muted">ước tính {formatVnd(totalVnd)}</span>}
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {shopping.groups.length === 0 && <Card className="text-sm text-muted">Chưa tính được: các món của ngày này chưa khai thành phần.</Card>}
        {shopping.groups.map((g) => (
          <Card key={g.supplier}>
            <div className="mb-1 flex items-center gap-2">
              <StampIcon name="house" size={24} print={PRINT.sky} />
              <b>{g.supplier}</b>
              <span className="ml-auto text-sm text-muted">{g.costVnd > 0 ? formatVnd(g.costVnd) : '—'}</span>
            </div>
            <ul className="flex flex-col divide-y divide-dashed divide-line text-sm">
              {g.lines.map((l) => (
                <li key={l.name} className="flex items-center justify-between gap-3 py-1.5">
                  <span>{l.name}</span>
                  <span className="flex items-center gap-3">
                    <b className="tabular-nums">
                      {Math.round(l.quantity).toLocaleString('vi-VN')}
                      {l.unit && ` ${l.unit}`}
                    </b>
                    <span className="min-w-12 text-right text-muted tabular-nums">{l.costVnd != null ? formatK(l.costVnd) : '—'}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {shopping.missing.length > 0 && (
        <p className="mt-3 rounded-2xl bg-lemon px-4 py-3 text-sm text-[#5C4A12]">
          <b>Chưa tính được giá:</b> {shopping.missing.join(', ')}. Thêm ở trang Nguyên liệu hoặc khai thành phần ở Giá vốn.
        </p>
      )}
      <p className="mt-3 text-[13px] text-muted">Gom từ công thức của từng món × số lượng. Chưa trừ đồ đã có ở nhà — tiệm chưa theo dõi tồn kho.</p>
    </>
  )
}
