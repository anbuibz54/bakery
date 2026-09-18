'use client'

import { useActionState } from 'react'
import { ActionResult, Field, SubmitButton, fieldClass } from '@/components/admin-ui'
import { Card } from '@/components/ui'
import { addCompetitorPriceAction, saveBenchmarkAction, type AdminState } from '../../_actions'

/** The metrics the dashboard knows how to compare against. */
const METRICS = [
  { metric: 'ingredient_pct', label: 'Nguyên liệu / giá bán (%)', unit: '%' },
  { metric: 'margin_pct', label: 'Lãi thật (%)', unit: '%' },
  { metric: 'aov_vnd', label: 'Trung bình mỗi đơn (đ)', unit: 'đ' },
  { metric: 'orders_per_week', label: 'Đơn mỗi tuần', unit: 'đơn' },
]

export function BenchmarkForms({
  marks,
  today,
}: {
  marks: { metric: string; label: string; lowValue: number | null; highValue: number | null; source: string | null }[]
  today: string
}) {
  const [markState, saveMark] = useActionState<AdminState, FormData>(saveBenchmarkAction, null)
  const [priceState, addPrice] = useActionState<AdminState, FormData>(addCompetitorPriceAction, null)

  return (
    <>
      <Card className="mt-3">
        <b>Mốc tham chiếu</b>
        <p className="mt-1 text-[13px] text-muted">Khoảng mà một tiệm bánh nhỏ thường nằm trong đó. Ghi luôn nguồn để sau còn kiểm lại.</p>
        <form action={saveMark} className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field label="Chỉ số">
            <select name="metric" className={fieldClass}>
              {METRICS.map((m) => (
                <option key={m.metric} value={m.metric}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tên hiển thị">
            <input name="label" maxLength={80} placeholder="Nguyên liệu / giá bán" className={fieldClass} required />
          </Field>
          <Field label="Từ">
            <input name="lowValue" type="number" step="0.01" className={fieldClass} required />
          </Field>
          <Field label="Đến">
            <input name="highValue" type="number" step="0.01" className={fieldClass} required />
          </Field>
          <Field label="Nguồn" hint="link hoặc tên bài viết">
            <input name="source" maxLength={200} className={fieldClass} />
          </Field>
          <Field label="Xem ngày">
            <input name="checkedOn" type="date" defaultValue={today} className={fieldClass} />
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <SubmitButton>Lưu mốc</SubmitButton>
            <ActionResult state={markState} />
          </div>
        </form>
        {marks.length > 0 && (
          <ul className="mt-3 flex flex-col divide-y divide-dashed divide-line text-sm">
            {marks.map((m) => (
              <li key={m.metric} className="flex justify-between gap-3 py-2">
                <span>
                  {m.label}
                  {m.source && <span className="block text-xs text-muted">{m.source}</span>}
                </span>
                <b className="whitespace-nowrap">
                  {m.lowValue} – {m.highValue}
                </b>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="mt-3">
        <b>Thêm giá của tiệm khác</b>
        <form action={addPrice} className="mt-2 grid gap-3 sm:grid-cols-2">
          <Field label="Tiệm">
            <input name="shopName" maxLength={80} placeholder="Savor" className={fieldClass} required />
          </Field>
          <Field label="Loại" hint="banh-kem, pastry, banh-viet, trung-thu">
            <input name="category" maxLength={40} placeholder="banh-kem" className={fieldClass} required />
          </Field>
          <Field label="Tên bánh">
            <input name="productLabel" maxLength={120} placeholder="Bánh kem dâu" className={fieldClass} required />
          </Field>
          <Field label="Size / quy cách">
            <input name="sizeLabel" maxLength={40} placeholder="18cm" className={fieldClass} />
          </Field>
          <Field label="Giá (đ)">
            <input name="priceVnd" type="number" min={1000} step={1000} className={fieldClass} required />
          </Field>
          <Field label="Xem ngày">
            <input name="checkedOn" type="date" defaultValue={today} className={fieldClass} required />
          </Field>
          <Field label="Link">
            <input name="url" maxLength={300} className={fieldClass} />
          </Field>
          <div className="flex items-center gap-3 sm:col-span-2">
            <SubmitButton>Lưu giá tiệm khác</SubmitButton>
            <ActionResult state={priceState} />
          </div>
        </form>
      </Card>
    </>
  )
}
