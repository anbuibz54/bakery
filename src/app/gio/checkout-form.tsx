'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { SocialLinks } from '@/components/social-links'
import { PRINT, StampIcon } from '@/components/stamp-icon'
import { buttonClass, Card, ProductArt, SectionTitle } from '@/components/ui'
import { dayState, slotOpen, type DayAvailability } from '@/lib/availability'
import { cartActions, useCart, type Cart } from '@/lib/cart'
import { currentChannel } from '@/lib/channel'
import { dayMonth } from '@/lib/dates'
import { formatK, formatVnd } from '@/lib/money'
import { DELIVERY_ZONES, PICKUP_ADDRESS } from '@/lib/shop'
import { depositFor } from '@/server/payments/status'
import { placeOrderAction, type CheckoutState } from '../_actions/shop'

const input =
  'h-12 w-full min-w-0 rounded-2xl bg-background px-3.5 placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-berry aria-invalid:outline-2 aria-invalid:outline-berry'
const label = 'mb-1.5 block text-[13px] font-bold'

export function CheckoutForm({ calendar }: { calendar: DayAvailability[] }) {
  const cart = useCart()
  if (!cart) return <div className="h-96 animate-pulse rounded-3xl bg-surface/60 motion-reduce:animate-none" aria-label="Đang mở giỏ" />
  if (cart.lines.length === 0) {
    return (
      <Card className="mx-auto mt-4 flex max-w-md flex-col items-center gap-3 px-6 py-10 text-center">
        <StampIcon name="gift" size={64} print={PRINT.lemon} />
        <p className="font-display text-xl font-bold">Giỏ đang trống</p>
        <p className="text-muted">Chọn một chiếc bánh cho người bạn thương nhé.</p>
        <Link href="/menu" className={`${buttonClass} mt-2`}>
          Xem menu
        </Link>
      </Card>
    )
  }
  return <Filled cart={cart} calendar={calendar} />
}

function Filled({ cart, calendar }: { cart: Cart; calendar: DayAvailability[] }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, null)
  const lead = Math.max(...cart.lines.map((l) => l.leadTimeHours))
  const openDays = calendar.filter((d) => dayState(d, lead).kind === 'open')

  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>(cart.gift ? 'delivery' : 'pickup')
  const [date, setDate] = useState(() => (openDays.some((d) => d.date === cart.date) ? cart.date! : (openDays[0]?.date ?? '')))
  const [slotId, setSlotId] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [f, setF] = useState({ phone: '', name: '', address: '', recipientName: '', recipientPhone: '', giftNote: '', note: '' })
  const [hidePrice, setHidePrice] = useState(true)
  const [saveOccasion, setSaveOccasion] = useState(false)
  const gift = cart.gift
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  const day = calendar.find((d) => d.date === date)
  const slot = day?.slots.find((s) => s.id === slotId && slotOpen(s, day, lead))
  const zone = DELIVERY_ZONES.find((z) => z.id === zoneId)
  const fee = fulfillment === 'delivery' ? (zone?.feeVnd ?? 0) : 0
  const lines = cart.lines.map((l) => ({ ...l, lineTotalVnd: l.unitPriceVnd * l.quantity }))
  const subtotal = lines.reduce((s, l) => s + l.lineTotalVnd, 0)
  const total = subtotal + fee
  const deposit = depositFor(lines, fee)
  const hasCake = cart.lines.some((l) => l.takesDeposit)

  const payload = JSON.stringify({
    lines: cart.lines.map((l) => ({ productId: l.productId, optionIds: l.optionIds, cakeMessage: l.cakeMessage, quantity: l.quantity })),
    fulfillment,
    date,
    slotId,
    zoneId: zoneId || undefined,
    address: f.address || undefined,
    phone: f.phone,
    name: f.name || undefined,
    gift,
    recipientName: f.recipientName || undefined,
    recipientPhone: f.recipientPhone || undefined,
    giftNote: f.giftNote || undefined,
    hidePrice,
    saveOccasion: hasCake && saveOccasion,
    channel: typeof window === 'undefined' ? 'direct' : currentChannel(),
    note: f.note || undefined,
  })
  const bad = (field: string) => (state?.field === field ? true : undefined)

  return (
    <form action={action} className="flex flex-col lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <input type="hidden" name="payload" value={payload} />
      <div className="contents lg:block">

      <Card className="flex flex-col gap-3.5">
        {cart.lines.map((l) => (
          <div key={l.key} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3">
            <ProductArt tone={l.tone} icon={l.takesDeposit ? 'cake' : 'croissant'} photoUrl={l.photoUrl} className="size-16 rounded-2xl" size={28} />
            <div className="min-w-0">
              <Link href={`/banh/${l.slug}`} className="block leading-tight font-bold">
                {l.name}
              </Link>
              <div className="truncate text-xs text-muted">
                {[l.optionSummary, l.cakeMessage && `"${l.cakeMessage}"`].filter(Boolean).join(' · ')}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <button type="button" aria-label={`Bớt ${l.name}`} onClick={() => cartActions.setQuantity(l.key, l.quantity - 1)} className="size-7 rounded-full bg-background font-bold">
                  −
                </button>
                <span className="w-5 text-center text-sm font-bold tabular-nums">{l.quantity}</span>
                <button type="button" aria-label={`Thêm ${l.name}`} onClick={() => cartActions.setQuantity(l.key, l.quantity + 1)} className="size-7 rounded-full bg-blush font-bold text-berry">
                  +
                </button>
              </div>
            </div>
            <span className="self-start font-bold tabular-nums">{formatK(l.unitPriceVnd * l.quantity)}</span>
          </div>
        ))}
      </Card>

      <SectionTitle className="mt-6 mb-3 text-xl">Nhận bánh thế nào?</SectionTitle>
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Cách nhận bánh">
        <Choice on={fulfillment === 'pickup'} onPick={() => setFulfillment('pickup')} icon="house" print={PRINT.pink} title="Tự đến lấy" hint={`${PICKUP_ADDRESS} · miễn phí`} />
        <Choice on={fulfillment === 'delivery'} onPick={() => setFulfillment('delivery')} icon="scooter" print={PRINT.sky} title="Giao tận nơi" hint="phí theo khu vực" />
      </div>

      <Card className="mt-3">
        <fieldset className="min-w-0">
          <legend className="mb-2.5 font-bold">Ngày nhận</legend>
          {openDays.length === 0 ? (
            <div className="text-sm text-muted">
              <p className="mb-2">Hai tuần tới đã kín lịch. Nhắn tiệm để hỏi thêm nhé.</p>
              <SocialLinks />
            </div>
          ) : (
            <div className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {openDays.map((d) => (
                <Pill key={d.date} on={d.date === date} onPick={() => {
                    setDate(d.date)
                    setSlotId('')
                    cartActions.setDate(d.date)
                  }} name="day">
                  {d.short}
                </Pill>
              ))}
            </div>
          )}
        </fieldset>
        {day && (
          <fieldset className="mt-4 min-w-0">
            <legend className="mb-2.5 font-bold">{day.long} · khung giờ</legend>
            <div className={`relative flex gap-2 ${bad('slot') ? 'rounded-2xl outline-2 outline-offset-4 outline-berry' : ''}`}>
              {day.slots.map((s) => {
                const open = slotOpen(s, day, lead)
                return (
                  <label
                    key={s.id}
                    className={`flex h-11 flex-1 items-center justify-center rounded-full text-sm has-focus-visible:outline-2 has-focus-visible:outline-berry ${
                      !open ? 'bg-line/70 text-muted/70' : s.id === slotId ? 'cursor-pointer bg-foreground font-bold text-white' : 'cursor-pointer bg-background'
                    }`}
                  >
                    <input type="radio" name="slot" className="sr-only" disabled={!open} checked={s.id === slotId} onChange={() => setSlotId(s.id)} />
                    {s.label}
                    {!open && ' · kín'}
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}
      </Card>

      <SectionTitle className="mt-6 mb-3 text-xl">Người đặt</SectionTitle>
      <Card className="flex flex-col gap-3">
        <div>
          <label htmlFor="phone" className={label}>
            Số điện thoại
          </label>
          <input id="phone" type="tel" inputMode="tel" autoComplete="tel" required value={f.phone} onChange={set('phone')} placeholder="0908 123 456" aria-invalid={bad('phone')} className={input} />
        </div>
        <div>
          <label htmlFor="name" className={label}>
            Tên
          </label>
          <input id="name" autoComplete="given-name" value={f.name} onChange={set('name')} placeholder="Vy" className={input} />
        </div>
        <p className="text-xs text-muted">Không cần tạo tài khoản. Tiến độ bánh xem ở trang theo dõi đơn; tiệm chỉ gọi khi cần hỏi thêm.</p>
      </Card>

      <div className="mt-6 mb-3 flex items-center justify-between gap-3">
        <SectionTitle className="flex items-center gap-2 text-xl">
          <StampIcon name="gift" size={30} print={PRINT.lemon} />
          Gửi tặng
        </SectionTitle>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={gift} onChange={(e) => cartActions.setGift(e.target.checked)} className="size-5 accent-berry" />
          Đây là quà
        </label>
      </div>
      {(gift || fulfillment === 'delivery') && (
        <Card className="flex flex-col gap-3">
          {gift && (
            <>
              <div>
                <label htmlFor="recipientName" className={label}>
                  Người nhận
                </label>
                <input id="recipientName" value={f.recipientName} onChange={set('recipientName')} placeholder="Mẹ Lan" aria-invalid={bad('recipientName')} className={input} />
              </div>
              <div>
                <label htmlFor="recipientPhone" className={label}>
                  SĐT người nhận <span className="font-normal text-muted">(để shipper gọi)</span>
                </label>
                <input id="recipientPhone" type="tel" inputMode="tel" value={f.recipientPhone} onChange={set('recipientPhone')} placeholder="0903 456 789" aria-invalid={bad('recipientPhone')} className={input} />
              </div>
            </>
          )}
          {fulfillment === 'delivery' && (
            <>
              <div>
                <label htmlFor="zone" className={label}>
                  Khu vực giao
                </label>
                <select id="zone" value={zoneId} onChange={(e) => setZoneId(e.target.value)} aria-invalid={bad('zone')} className={input}>
                  <option value="">Chọn khu vực</option>
                  {DELIVERY_ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label} · {formatK(z.feeVnd)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="address" className={label}>
                  Địa chỉ giao
                </label>
                <input id="address" autoComplete="street-address" value={f.address} onChange={set('address')} placeholder="12 đường số 5, P. Tân Phong, Q.7" aria-invalid={bad('address')} className={input} />
              </div>
            </>
          )}
          {gift && (
            <>
              <div>
                <label htmlFor="giftNote" className={label}>
                  Lời trên thiệp
                </label>
                <textarea
                  id="giftNote"
                  value={f.giftNote}
                  onChange={set('giftNote')}
                  maxLength={300}
                  rows={3}
                  placeholder="Con thương mẹ. Chúc mẹ vẫn cười nhiều như vầy nha!"
                  className="w-full rounded-2xl bg-lemon px-3.5 py-3 placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-berry"
                />
              </div>
              <label className="flex items-start gap-2.5 text-sm">
                <input type="checkbox" checked={hidePrice} onChange={(e) => setHidePrice(e.target.checked)} className="mt-0.5 size-5 accent-berry" />
                Giấu giá trong hộp và trên tin nhắn cho người nhận
              </label>
            </>
          )}
        </Card>
      )}

      {hasCake && date && (
        <section className="mt-4 grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-3xl bg-sky p-4">
          <StampIcon name="calendar" size={32} print={PRINT.lemon} />
          <div>
            <p className="font-bold">
              Lưu ngày {dayMonth(date)} là sinh nhật {gift && f.recipientName ? f.recipientName : 'người nhận bánh'}?
            </p>
            <p className="mt-0.5 text-[13px] text-foreground/75">Năm sau tiệm nhắn tin nhắc bạn trước 7 ngày. Một tin mỗi năm, tắt lúc nào cũng được.</p>
            <label className="mt-2 flex items-start gap-2.5 text-sm">
              <input type="checkbox" checked={saveOccasion} onChange={(e) => setSaveOccasion(e.target.checked)} className="mt-0.5 size-5 accent-berry" />
              Tôi đồng ý để tiệm lưu ngày này và số điện thoại của tôi để nhắn nhắc.
            </label>
          </div>
        </section>
      )}

      <Card className="mt-4">
        <label htmlFor="note" className={label}>
          Dặn tiệm <span className="font-normal text-muted">(không bắt buộc)</span>
        </label>
        <input id="note" value={f.note} onChange={set('note')} maxLength={500} placeholder="Ít ngọt, dị ứng đậu phộng…" className={input} />
      </Card>

      </div>

      <div className="lg:sticky lg:top-24">
      <Card className="mt-4 flex flex-col gap-1.5 text-sm tabular-nums lg:mt-0">
        <Row k="Tạm tính" v={formatVnd(subtotal)} />
        {fulfillment === 'delivery' && <Row k="Phí giao" v={zone ? formatVnd(fee) : 'chọn khu vực'} />}
        <div className="my-1 border-t border-dashed border-line" />
        <Row k={<b>Tổng</b>} v={<b>{formatVnd(total)}</b>} />
        {deposit < total ? (
          <>
            <Row k={<b className="text-berry">Cọc bây giờ</b>} v={<b className="text-berry">{formatVnd(deposit)}</b>} />
            <p className="text-xs text-muted">
              Cọc = 50% bánh kem + bánh làm sẵn + phí giao. Còn {formatVnd(total - deposit)} trả khi nhận.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted">Bánh làm sẵn thanh toán đủ khi đặt.</p>
        )}
        {fulfillment === 'delivery' && <p className="text-xs text-muted">Phí giao là ước tính theo khu vực; xa hơn tiệm sẽ nhắn trước.</p>}
      </Card>

      {state?.error && (
        <p role="alert" className="mt-4 rounded-2xl bg-blush px-4 py-3 text-sm font-bold text-berry">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending || !slot || !date} className={`${buttonClass} mt-4 h-14 w-full text-base`}>
        {pending ? 'Đang gửi đơn…' : !slot ? 'Chọn khung giờ nhận' : `Đặt bánh · ${deposit < total ? 'cọc ' : ''}${formatVnd(deposit)}`}
      </button>
      </div>
    </form>
  )
}

function Choice({ on, onPick, icon, print, title, hint }: { on: boolean; onPick: () => void; icon: 'house' | 'scooter'; print: string; title: string; hint: string }) {
  return (
    <label
      className={`relative cursor-pointer rounded-3xl bg-surface p-4 shadow-[var(--shadow-soft)] has-focus-visible:outline-2 has-focus-visible:outline-berry ${on ? 'outline-2 outline-berry' : ''}`}
    >
      <input type="radio" name="fulfillment" checked={on} onChange={onPick} className="sr-only" />
      <StampIcon name={icon} size={30} print={print} />
      <span className="mt-1.5 block font-bold">{title}</span>
      <span className="block text-xs text-muted">{hint}</span>
    </label>
  )
}

function Pill({ on, onPick, name, children }: { on: boolean; onPick: () => void; name: string; children: React.ReactNode }) {
  return (
    <label
      className={`flex h-10 flex-none cursor-pointer items-center rounded-full px-4 text-sm has-focus-visible:outline-2 has-focus-visible:outline-berry ${
        on ? 'bg-sky font-bold' : 'bg-background'
      }`}
    >
      <input type="radio" name={name} checked={on} onChange={onPick} className="sr-only" />
      {children}
    </label>
  )
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={typeof k === 'string' ? 'text-muted' : ''}>{k}</span>
      <span>{v}</span>
    </div>
  )
}
