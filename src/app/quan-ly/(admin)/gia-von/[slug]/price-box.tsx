'use client'

import { useActionState, useState } from 'react'
import { ActionResult, Field, SubmitButton, fieldClass } from '@/components/admin-ui'
import { Card } from '@/components/ui'
import { formatVnd } from '@/lib/money'
import { productTimesAction, setPriceAction, type AdminState } from '../../../_actions'

/**
 * Try a price before committing to it, and keep the minutes that drive labour
 * and energy cost next to the number they change.
 */
export function PriceBox({
  productId,
  priceVnd,
  basePriceVnd,
  optionDeltaVnd,
  unitCostVnd,
  suggestedVnd,
  labourMinutes,
  ovenMinutes,
}: {
  productId: string
  priceVnd: number
  basePriceVnd: number
  optionDeltaVnd: number
  unitCostVnd: number | null
  suggestedVnd: number | null
  labourMinutes: number
  ovenMinutes: number
}) {
  const [priceState, setPrice] = useActionState<AdminState, FormData>(setPriceAction, null)
  const [timesState, setTimes] = useActionState<AdminState, FormData>(productTimesAction, null)
  const [test, setTest] = useState(priceVnd)

  const profit = unitCostVnd != null ? test - unitCostVnd : null
  const margin = profit != null && test > 0 ? profit / test : null

  return (
    <>
      <Card className="mt-3 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <b>Thử giá</b>
          <span className="font-display text-xl font-bold text-berry">{formatVnd(test)}</span>
        </div>
        <input
          type="range"
          min={Math.max(10_000, Math.round((unitCostVnd ?? priceVnd) * 0.8))}
          max={Math.round(Math.max(priceVnd, unitCostVnd ?? 0) * 2.2)}
          step={5000}
          value={test}
          onChange={(e) => setTest(Number(e.target.value))}
          aria-label="Giá bán thử"
          className="accent-berry"
        />
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-2xl bg-background px-3 py-2">
            Lãi mỗi cái: <b>{profit != null ? formatVnd(profit) : '—'}</b>
            {margin != null && <span className={margin >= 0.3 ? ' text-mint-ink' : ' text-berry'}> · {Math.round(margin * 100)}%</span>}
          </span>
          {suggestedVnd != null && (
            <button type="button" onClick={() => setTest(suggestedVnd)} className="rounded-2xl bg-blush px-3 py-2 font-bold text-berry">
              Gợi ý {formatVnd(suggestedVnd)}
            </button>
          )}
        </div>
        <form action={setPrice} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="priceVnd" value={Math.max(0, test - optionDeltaVnd)} />
          <SubmitButton>Áp dụng giá này</SubmitButton>
          <span className="text-[13px] text-muted">
            Giá gốc của món sẽ thành {formatVnd(Math.max(0, test - optionDeltaVnd))}
            {optionDeltaVnd !== 0 && ` (size đang xem cộng thêm ${formatVnd(optionDeltaVnd)})`}; giá cũ {formatVnd(basePriceVnd)}.
          </span>
        </form>
        <ActionResult state={priceState} />
      </Card>

      <Card className="mt-3">
        <b>Thời gian làm</b>
        <form action={setTimes} className="mt-2 grid grid-cols-2 gap-3">
          <input type="hidden" name="productId" value={productId} />
          <Field label="Công làm (phút)">
            <input name="labourMinutes" type="number" min={0} max={2000} defaultValue={labourMinutes} className={fieldClass} />
          </Field>
          <Field label="Lò chạy (phút)">
            <input name="ovenMinutes" type="number" min={0} max={2000} defaultValue={ovenMinutes} className={fieldClass} />
          </Field>
          <div className="col-span-2 flex items-center gap-3">
            <SubmitButton>Lưu thời gian</SubmitButton>
            <ActionResult state={timesState} />
          </div>
        </form>
      </Card>
    </>
  )
}
