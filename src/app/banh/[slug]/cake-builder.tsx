'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Card } from '@/components/ui'
import { dayState, type DayAvailability } from '@/lib/availability'
import { cartActions, useCart } from '@/lib/cart'
import { formatK, formatVnd } from '@/lib/money'
import type { ProductDetail } from '@/server/catalog/service'

const DATE_CHIPS = 7

export function CakeBuilder({ product, calendar, startAsGift }: { product: ProductDetail; calendar: DayAvailability[]; startAsGift: boolean }) {
  const router = useRouter()
  const cart = useCart()
  const [picked, setPicked] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.groups.map((g) => [g.name, g.options[0].id])),
  )
  const [message, setMessage] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [giftChoice, setGiftChoice] = useState<boolean | null>(startAsGift ? true : null)
  const [dateChoice, setDateChoice] = useState<string | null>(null)

  const gift = giftChoice ?? cart?.gift ?? false
  const date = dateChoice ?? cart?.date ?? null

  const chosen = product.groups.map((g) => g.options.find((o) => o.id === picked[g.name])!)
  const unit = product.basePriceVnd + chosen.reduce((s, o) => s + o.priceDeltaVnd, 0)
  const total = unit * quantity
  const deposit = product.takesDeposit ? Math.ceil(total / 2 / 1000) * 1000 : null
  const days = calendar.slice(0, DATE_CHIPS).map((d) => ({ day: d, state: dayState(d, product.leadTimeHours) }))

  function add() {
    cartActions.add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        optionSummary: chosen.map((o) => (o.detail ? `${o.label} · ${o.detail}` : o.label)).join(', '),
        optionIds: chosen.map((o) => o.id),
        cakeMessage: product.takesDeposit ? message.trim() || undefined : undefined,
        quantity,
        unitPriceVnd: unit,
        takesDeposit: product.takesDeposit,
        leadTimeHours: product.leadTimeHours,
        tone: product.tone,
        photoUrl: product.photoUrl,
      },
      { gift, date },
    )
    router.push('/gio')
  }

  return (
    <>
      {product.groups.length > 0 && (
        <Card className="mt-[18px]">
          {product.groups.map((g, gi) => (
            <fieldset key={g.name} className={gi > 0 ? 'mt-4 min-w-0' : 'min-w-0'}>
              <legend className="mb-2.5 font-bold">{g.name === 'size' ? 'Bánh cho mấy người?' : g.name}</legend>
              <div className={g.name === 'size' ? 'relative flex gap-2' : 'relative flex flex-wrap gap-2'}>
                {g.options.map((o) => {
                  const on = picked[g.name] === o.id
                  return (
                    <label
                      key={o.id}
                      className={`cursor-pointer text-center has-focus-visible:outline-2 has-focus-visible:outline-berry ${
                        g.name === 'size'
                          ? `flex-1 rounded-[18px] py-2.5 ${on ? 'bg-berry text-white' : 'bg-background'}`
                          : `flex h-[38px] items-center rounded-full px-4 ${on ? 'bg-blush font-bold text-berry' : 'bg-background'}`
                      }`}
                    >
                      <input type="radio" name={g.name} value={o.id} checked={on} onChange={() => setPicked({ ...picked, [g.name]: o.id })} className="sr-only" />
                      {g.name === 'size' ? (
                        <>
                          <span className="block font-bold">{o.label.replace(' người', '')}</span>
                          <span className={`block text-xs ${on ? '' : 'text-muted'}`}>
                            {o.detail} · {formatK(product.basePriceVnd + o.priceDeltaVnd)}
                          </span>
                        </>
                      ) : (
                        <>
                          {o.label}
                          {o.priceDeltaVnd > 0 && ` +${formatK(o.priceDeltaVnd)}`}
                        </>
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          ))}
        </Card>
      )}

      <Card className="mt-3.5">
        {product.takesDeposit ? (
          <>
            <label htmlFor="cake-message" className="mb-2.5 block font-bold">
              Lời chúc trên bánh
            </label>
            <input
              id="cake-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={60}
              placeholder="Mừng sinh nhật Mẹ 60 tuổi"
              className="h-12 w-full rounded-2xl bg-background px-3.5 focus-visible:outline-2 focus-visible:outline-berry"
            />
            <p className="mt-1 text-right text-xs text-muted tabular-nums">{message.length}/60 · viết chữ miễn phí</p>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <span className="font-bold">Số hộp</span>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Bớt một" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="size-10 rounded-full bg-background text-lg font-bold">
                −
              </button>
              <span className="w-6 text-center font-bold tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <button type="button" aria-label="Thêm một" onClick={() => setQuantity(Math.min(20, quantity + 1))} className="size-10 rounded-full bg-blush text-lg font-bold text-berry">
                +
              </button>
            </div>
          </div>
        )}
        <label className="mt-3.5 grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
          <span>
            <span className="block font-bold">Đây là quà tặng</span>
            <span className="block text-[13px] text-muted">Giấu giá, thêm thiệp, giao cho người nhận</span>
          </span>
          <input type="checkbox" checked={gift} onChange={(e) => setGiftChoice(e.target.checked)} className="peer sr-only" />
          <span
            aria-hidden="true"
            className="relative h-[30px] w-[50px] rounded-full bg-line transition-colors peer-checked:bg-berry peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-berry after:absolute after:top-[3px] after:left-[3px] after:size-6 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"
          />
        </label>
      </Card>

      <Card className="mt-3.5">
        <fieldset className="min-w-0">
          <legend className="mb-2.5 font-bold">Nhận ngày nào?</legend>
          <div className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {days.map(({ day, state }) => {
              const on = date === day.date && state.kind === 'open'
              const disabled = state.kind !== 'open'
              return (
                <label
                  key={day.date}
                  className={`min-w-[62px] flex-none rounded-2xl py-2 text-center text-[13px] has-focus-visible:outline-2 has-focus-visible:outline-berry ${
                    disabled ? 'bg-line/70 text-muted/70' : on ? 'cursor-pointer bg-sky font-bold' : 'cursor-pointer bg-background'
                  }`}
                >
                  <input type="radio" name="date" value={day.date} disabled={disabled} checked={on} onChange={() => setDateChoice(day.date)} className="sr-only" />
                  <span className="block font-bold">{day.short}</span>
                  <span className="block text-[11px]">
                    {state.kind === 'too-soon' ? 'gấp quá' : state.kind === 'full' ? 'kín lịch' : `còn ${state.left}`}
                  </span>
                </label>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Chọn khung giờ ở bước đặt bánh.</p>
        </fieldset>
      </Card>

      {product.takesDeposit && (
        <p className="mt-3.5 rounded-[20px] bg-lemon px-4 py-3 text-[13px] text-foreground/85">
          Cọc <b>50%</b> để giữ lịch nướng. Phần còn lại trả khi nhận. Hủy trước 48 giờ được hoàn cọc.
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-10 px-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:static lg:mt-4 lg:px-0 lg:pb-0">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-[26px] bg-foreground py-2.5 pr-2.5 pl-5 text-white shadow-lg lg:max-w-none lg:py-3.5 lg:pr-3.5 lg:pl-6">
          <div>
            <div className="font-display text-lg leading-tight font-bold tabular-nums">{formatVnd(total)}</div>
            {deposit !== null && <div className="text-xs text-white/70 tabular-nums">cọc {formatVnd(deposit)}</div>}
          </div>
          <button type="button" onClick={add} className="h-12 rounded-full bg-pink px-6 font-bold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Thêm vào giỏ
          </button>
        </div>
      </div>
    </>
  )
}
