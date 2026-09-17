import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PRINT, StampIcon, type StampName } from '@/components/stamp-icon'
import { buttonClass, Card } from '@/components/ui'
import { inlineDay, stamp, vnDate, vnHour } from '@/lib/dates'
import { formatVnd } from '@/lib/money'
import { slotLabelForHour } from '@/lib/shop'
import { getTracking, type Tracking } from '@/server/orders/tracking'

export const metadata: Metadata = { title: 'Đơn bánh · Vibe Bánh', robots: { index: false } }

type Status = Tracking['status']

/** The story's chapters, in order. `delivering` only for delivery orders. */
const STEPS: { status: Status; icon: StampName; print: string; title: (o: Tracking) => string; hint: string }[] = [
  { status: 'confirmed', icon: 'check', print: PRINT.mint, title: () => 'Lịch nướng đã giữ', hint: 'Sau khi tiệm nhận cọc.' },
  { status: 'baking', icon: 'oven', print: PRINT.peach, title: () => 'Cốt bánh vào lò', hint: 'Sáng ngày nhận, hoặc tối hôm trước.' },
  { status: 'decorating', icon: 'bowl', print: PRINT.pink, title: () => 'Đánh kem, trang trí', hint: 'Viết lời chúc lên bánh.' },
  { status: 'ready', icon: 'camera', print: PRINT.sky, title: () => 'Chụp bánh trước khi giao', hint: 'Bạn xem ảnh chiếc bánh thật tại đây.' },
  { status: 'delivering', icon: 'scooter', print: PRINT.lemon, title: (o) => `Đang giao tới ${o.recipientName ?? 'bạn'}`, hint: 'Shipper gọi trước khi tới.' },
  { status: 'completed', icon: 'gift', print: PRINT.lilac, title: (o) => (o.fulfillment === 'delivery' ? 'Đã giao' : 'Đã nhận bánh'), hint: 'Chúc cả nhà ngon miệng.' },
]

const HEADLINE: Record<Status, string> = {
  pending: 'đang chờ cọc',
  confirmed: 'đã có lịch nướng',
  baking: 'đang ở trong lò',
  decorating: 'đang được phủ kem',
  ready: 'đã xong, chờ giao',
  delivering: 'đang trên đường',
  completed: 'đã tới nơi',
  cancelled: 'đã huỷ',
}

export default async function TrackingPage({ params }: PageProps<'/don/[token]'>) {
  const { token } = await params
  const order = await getTracking(token)
  if (!order) notFound()

  const steps = STEPS.filter((s) => s.status !== 'delivering' || order.fulfillment === 'delivery')
  const reached = new Map(order.events.filter((e) => e.status).map((e) => [e.status, e]))
  const current = steps.findLastIndex((s) => reached.has(s.status))
  const whose = order.recipientName ? `Bánh của ${order.recipientName}` : 'Bánh của bạn'
  const date = vnDate(order.scheduledFor)
  const when = `${order.fulfillment === 'delivery' ? 'Giao' : 'Nhận'} ${inlineDay(date)}, ${slotLabelForHour(vnHour(order.scheduledFor))}`
  const remaining = order.totalVnd - order.paidVnd
  const unpaid = order.status === 'pending' && order.paymentStatus !== 'deposit_paid' && order.paymentStatus !== 'paid'
  const notes = order.events.filter((e) => !e.status && e.message)

  return (
    <main className="mx-auto w-full max-w-md pb-10">
      <header className="rounded-b-[32px] bg-pink px-5 pt-[18px] pb-5">
        <p className="text-[13px] text-[#8C3B5E]">
          Đơn {order.code}
          {order.recipientName && ` · gửi ${order.recipientName}`}
        </p>
        <h1 className="mt-1 font-display text-[26px] leading-tight font-bold text-balance">
          {whose} {HEADLINE[order.status]}
        </h1>
        <p className="mt-2 text-sm text-[#5E4B5C]">
          {when}
          {order.deliveryAddress && ` · ${order.deliveryAddress}`}
        </p>
      </header>

      <div className="px-5">
        {order.status === 'cancelled' ? (
          <Card className="mt-5 text-center">Đơn này đã huỷ. Có gì thắc mắc, bạn nhắn Zalo tiệm nhé.</Card>
        ) : (
          <>
            {unpaid && (
              <Card className="mt-5 flex flex-col items-center gap-3 text-center">
                <p>Tiệm chưa nhận được cọc cho đơn này.</p>
                <Link href={`/don/${token}/thanh-toan`} className={buttonClass}>
                  Thanh toán cọc
                </Link>
              </Card>
            )}

            <ol className="mt-[22px]">
              {steps.map((s, i) => {
                const event = reached.get(s.status)
                const done = i <= current
                const now = i === current
                return (
                  <li key={s.status} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex size-12 items-center justify-center rounded-full ${done ? 'bg-surface' : 'bg-[#F4EEF2]'} ${now ? 'shadow-[inset_0_0_0_2px_var(--berry)]' : ''}`}
                      >
                        <StampIcon name={s.icon} size={30} print={done ? s.print : '#E5D8DF'} className={done ? '' : 'text-[#B8AAB6]'} />
                      </div>
                      {i < steps.length - 1 && <div className={`my-1 w-0.5 flex-1 ${i < current ? 'bg-pink' : 'bg-line'}`} />}
                    </div>
                    <div className="pb-[18px]">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`font-bold ${done ? '' : 'text-[#A597A3]'}`}>{s.title(order)}</span>
                        {event && <span className="text-xs whitespace-nowrap text-muted">{stamp(event.createdAt)}</span>}
                      </div>
                      <p className={`text-sm ${done ? 'text-[#5E4B5C]' : 'text-[#B8AAB6]'}`}>{event?.message ?? s.hint}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </>
        )}

        {notes.length > 0 && (
          <Card className="mt-2 flex flex-col gap-2 text-sm">
            <p className="font-bold">Tin từ tiệm</p>
            {notes.map((n, i) => (
              <p key={i} className="text-[#5E4B5C]">
                <span className="text-xs text-muted">{stamp(n.createdAt)} · </span>
                {n.message}
              </p>
            ))}
          </Card>
        )}

        <Card className="mt-3.5">
          <p className="mb-2 font-bold">Trong hộp</p>
          <ul className="flex flex-col gap-2 text-sm">
            {order.items.map((it, i) => (
              <li key={i}>
                <span className="font-bold">
                  {it.productName}
                  {it.quantity > 1 && ` × ${it.quantity}`}
                </span>
                {it.options.length > 0 && <span className="text-muted"> · {it.options.map((o) => o.label).join(', ')}</span>}
                {it.cakeMessage && <span className="block text-muted">Chữ trên bánh: &quot;{it.cakeMessage}&quot;</span>}
              </li>
            ))}
          </ul>
          {order.giftNote && <p className="mt-3 rounded-2xl bg-lemon px-3.5 py-2.5 text-sm">Thiệp: {order.giftNote}</p>}
        </Card>

        {!order.hidePrice && order.status !== 'cancelled' && !unpaid && remaining > 0 && (
          <div className="mt-3.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-sky p-4">
            <div>
              <p className="font-bold">Còn lại khi nhận</p>
              <p className="text-[13px] text-[#3F5563]">tiền mặt hoặc chuyển khoản</p>
            </div>
            <span className="font-display text-xl font-bold tabular-nums">{formatVnd(remaining)}</span>
          </div>
        )}

        <p className="mt-4 text-center text-[13px] text-muted">Link này không cần đăng nhập, gửi cho người nhà xem cũng được.</p>
      </div>
    </main>
  )
}
