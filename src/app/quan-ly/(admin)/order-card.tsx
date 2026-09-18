'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { ActionResult, SubmitButton } from '@/components/admin-ui'
import { Card } from '@/components/ui'
import { moveOrderAction, noteOrderAction, type AdminState } from '../_actions'

export type AdminOrder = {
  id: string
  code: string
  trackToken: string
  status: string
  statusLabel: string
  nextStatus: string | null
  nextLabel: string | null
  slot: string
  fulfillment: string
  address: string | null
  recipient: string | null
  customer: string
  note: string | null
  paid: string
  total: string
  owing: number
  items: { name: string; quantity: number; options: string; message: string | null }[]
}

export function OrderCard({ order }: { order: AdminOrder }) {
  const [moveState, move] = useActionState<AdminState, FormData>(moveOrderAction, null)
  const [noteState, note] = useActionState<AdminState, FormData>(noteOrderAction, null)

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-display text-lg font-bold">{order.code}</span>
          <span className="ml-2 text-sm text-muted">
            {order.slot} · {order.fulfillment === 'delivery' ? 'giao' : 'tự lấy'}
          </span>
        </div>
        <span className="rounded-full bg-blush px-3 py-1 text-xs font-bold text-berry">{order.statusLabel}</span>
      </div>

      <ul className="flex flex-col gap-1 text-sm">
        {order.items.map((i, n) => (
          <li key={n}>
            <b>
              {i.name}
              {i.quantity > 1 && ` × ${i.quantity}`}
            </b>
            {i.options && <span className="text-muted"> · {i.options}</span>}
            {i.message && <span className="block text-muted">Chữ: &quot;{i.message}&quot;</span>}
          </li>
        ))}
      </ul>

      <div className="text-sm text-muted">
        <p>{order.customer}</p>
        {order.recipient && <p>Gửi tặng: {order.recipient}</p>}
        {order.address && <p>{order.address}</p>}
        {order.note && <p className="text-foreground">Dặn: {order.note}</p>}
        <p>
          Đã trả {order.paid} / {order.total}
          {order.owing > 0 && <span className="font-bold text-berry"> · còn {order.owing.toLocaleString('vi-VN')}đ</span>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {order.nextStatus && (
          <form action={move}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="status" value={order.nextStatus} />
            <SubmitButton pendingLabel="Đang lưu…">Chuyển sang: {order.nextLabel}</SubmitButton>
          </form>
        )}
        <Link href={`/don/${order.trackToken}`} className="h-11 rounded-full bg-background px-4 leading-[44px] font-bold">
          Trang của khách
        </Link>
      </div>
      <ActionResult state={moveState} />

      <details className="text-sm">
        <summary className="cursor-pointer font-bold">Nhắn một dòng cho khách</summary>
        <form action={note} className="mt-2 flex flex-col gap-2">
          <input type="hidden" name="orderId" value={order.id} />
          <input
            name="message"
            maxLength={200}
            placeholder="Dâu hôm nay đỏ lắm, bánh sẽ đẹp."
            className="h-11 w-full rounded-2xl bg-background px-3.5 focus-visible:outline-2 focus-visible:outline-berry"
          />
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" name="hidden" className="size-4 accent-berry" />
            Ghi chú riêng, khách không thấy
          </label>
          <SubmitButton className="self-start">Gửi</SubmitButton>
          <ActionResult state={noteState} />
        </form>
      </details>
    </Card>
  )
}
