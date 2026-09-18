import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Card, SectionTitle } from '@/components/ui'
import { longDay, shortDay, vnDate, vnHour } from '@/lib/dates'
import { formatVnd } from '@/lib/money'
import { slotLabelForHour } from '@/lib/shop'
import { NEXT_STATUS, ordersOnDay, upcomingBakeDays, type OrderStatus } from '@/server/admin/orders'
import { OrderCard } from './order-card'

export const metadata: Metadata = { title: 'Đơn · Vibe Bánh', robots: { index: false } }

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Chờ cọc',
  confirmed: 'Đã cọc',
  baking: 'Đang nướng',
  decorating: 'Đang trang trí',
  ready: 'Xong, chờ giao',
  delivering: 'Đang giao',
  completed: 'Đã xong',
  cancelled: 'Đã huỷ',
}

export default async function AdminOrdersPage({ searchParams }: PageProps<'/quan-ly'>) {
  await connection()
  const { ngay } = await searchParams
  const days = await upcomingBakeDays()
  const date = typeof ngay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ngay) ? ngay : (days[0]?.date ?? vnDate())
  const list = await ordersOnDay(date)

  return (
    <>
      <SectionTitle>Đơn theo ngày nhận</SectionTitle>
      <nav className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
        {days.length === 0 && <p className="text-sm text-muted">Chưa có đơn nào sắp tới.</p>}
        {days.map((d) => (
          <Link
            key={d.date}
            href={`/quan-ly?ngay=${d.date}`}
            aria-current={d.date === date ? 'page' : undefined}
            className={`flex h-11 flex-none items-center gap-2 rounded-full px-4 text-sm ${d.date === date ? 'bg-foreground font-bold text-white' : 'bg-surface shadow-[var(--shadow-soft)]'}`}
          >
            {shortDay(d.date)}
            <span className={`rounded-full px-2 text-xs font-bold ${d.date === date ? 'bg-white/20' : 'bg-blush text-berry'}`}>{d.count}</span>
          </Link>
        ))}
      </nav>

      <p className="mt-3 text-sm text-muted">{longDay(date)}</p>

      <div className="mt-3 flex flex-col gap-3">
        {list.length === 0 && <Card className="text-center text-muted">Ngày này chưa có đơn.</Card>}
        {list.map((o) => (
          <OrderCard
            key={o.id}
            order={{
              id: o.id,
              code: o.code,
              trackToken: o.trackToken,
              status: o.status,
              statusLabel: STATUS_LABEL[o.status],
              nextStatus: nextFor(o.status, o.fulfillment),
              nextLabel: nextFor(o.status, o.fulfillment) ? STATUS_LABEL[nextFor(o.status, o.fulfillment)!] : null,
              slot: slotLabelForHour(vnHour(o.scheduledFor)),
              fulfillment: o.fulfillment,
              address: o.deliveryAddress,
              recipient: o.recipientName,
              customer: [o.customerName, o.customerPhone].filter(Boolean).join(' · '),
              note: o.customerNote,
              paid: formatVnd(o.paidVnd),
              total: formatVnd(o.totalVnd),
              owing: o.totalVnd - o.paidVnd,
              items: o.items.map((i) => ({
                name: i.productName,
                quantity: i.quantity,
                options: (i.options as { label: string }[]).map((x) => x.label).join(', '),
                message: i.cakeMessage,
              })),
            }}
          />
        ))}
      </div>
    </>
  )
}

/** Pickup orders never go through "đang giao". */
function nextFor(status: OrderStatus, fulfillment: string): OrderStatus | null {
  const next = NEXT_STATUS[status]
  if (next === 'delivering' && fulfillment !== 'delivery') return 'completed'
  return next
}
