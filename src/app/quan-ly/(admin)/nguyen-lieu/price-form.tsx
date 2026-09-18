'use client'

import { useActionState, useState } from 'react'
import { ActionResult, Field, SubmitButton, fieldClass } from '@/components/admin-ui'
import { Card } from '@/components/ui'
import { recordPriceAction, type AdminState } from '../../_actions'

/**
 * One purchase = one row. Buying the same thing again at a new price is a new
 * row, never an edit, so the trend and old orders stay honest.
 */
export function PriceForm({
  ingredients,
  suppliers,
  today,
}: {
  ingredients: { id: string; name: string; unit: string }[]
  suppliers: string[]
  today: string
}) {
  const [state, action] = useActionState<AdminState, FormData>(recordPriceAction, null)
  const [existing, setExisting] = useState('')

  return (
    <Card className="mt-3">
      <b>Ghi giá vừa mua</b>
      <form action={action} className="mt-2 grid gap-3 sm:grid-cols-2">
        <Field label="Nguyên liệu">
          <select name="ingredientId" value={existing} onChange={(e) => setExisting(e.target.value)} className={fieldClass}>
            <option value="">— thêm mới —</option>
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </Field>
        {!existing && (
          <>
            <Field label="Tên mới">
              <input name="name" maxLength={120} placeholder="Bơ lạt Anchor" className={fieldClass} required />
            </Field>
            <Field label="Tính theo">
              <select name="unit" className={fieldClass} defaultValue="g">
                <option value="g">gram</option>
                <option value="ml">ml</option>
                <option value="cai">cái</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="isPackaging" className="size-4 accent-berry" />
              Là bao bì (hộp, nến, thiệp)
            </label>
          </>
        )}
        <Field label="Gói bao nhiêu" hint="1kg = 1000, hộp 10 cái = 10">
          <input name="packQuantity" type="number" step="0.1" min="0.1" className={fieldClass} required />
        </Field>
        <Field label="Ghi trên nhãn">
          <input name="packLabel" maxLength={60} placeholder="1kg" className={fieldClass} />
        </Field>
        <Field label="Giá cả gói (đ)">
          <input name="priceVnd" type="number" min="1000" step="500" className={fieldClass} required />
        </Field>
        <Field label="Mua ở đâu">
          <input name="supplier" list="suppliers" maxLength={120} placeholder="Bếp Bánh Q.7" className={fieldClass} />
          <datalist id="suppliers">
            {suppliers.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label="Ngày mua">
          <input name="boughtOn" type="date" defaultValue={today} className={fieldClass} required />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <SubmitButton>Lưu giá</SubmitButton>
          <ActionResult state={state} />
        </div>
      </form>
    </Card>
  )
}
