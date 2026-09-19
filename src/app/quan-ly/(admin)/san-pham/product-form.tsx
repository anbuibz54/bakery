'use client'

import { useActionState, useState } from 'react'
import { ActionResult, Field, SubmitButton, fieldClass } from '@/components/admin-ui'
import { Card } from '@/components/ui'
import type { Category } from '@/lib/catalog'
import { createProductAction, updateProductAction, type AdminState } from '../../_actions'

export type ProductValues = {
  id?: string
  name: string
  category: string
  summary: string
  description: string
  basePriceVnd: number
  leadTimeHours: number
  takesDeposit: boolean
  featured: boolean
  soldOutNote: string | null
  tone: string
  isActive: boolean
  position: number
  recipeId: string | null
}

/** Background colours offered for a product without a photo (and behind a loading photo). */
const TONES = ['#f6c1d4', '#fde3ec', '#f8ddb0', '#fff0b3', '#d5efe3', '#cfe8f3', '#e4daf5', '#e8d3b9']

/** The product's own fields. Used for "Tự nhập" (create) and on the edit page. */
export function ProductForm({ product, categories, recipes }: { product: ProductValues; categories: Category[]; recipes: { id: string; title: string }[] }) {
  const [state, action] = useActionState<AdminState, FormData>(product.id ? updateProductAction : createProductAction, null)
  const [soldOut, setSoldOut] = useState(Boolean(product.soldOutNote))
  const [tone, setTone] = useState(product.tone)

  return (
    <form action={action} className="flex flex-col gap-3">
      {product.id && <input type="hidden" name="productId" value={product.id} />}
      <input type="hidden" name="tone" value={tone} />

      <Card className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên bánh">
          <input name="name" required maxLength={80} defaultValue={product.name} placeholder="Bánh kem xoài" className={fieldClass} />
        </Field>
        <Field label="Loại">
          <select name="category" required defaultValue={product.category} className={fieldClass}>
            <option value="">Chọn loại</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
                {c.isActive ? '' : ' (đang ẩn)'}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Một dòng dưới tên" hint="hiện trên thẻ menu: quy cách, điểm nổi bật">
            <input name="summary" maxLength={120} defaultValue={product.summary} placeholder="Hộp 4 cái · vỏ tự cán, nhân quế" className={fieldClass} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Mô tả" hint="hiện ở trang chi tiết">
            <textarea
              name="description"
              maxLength={1000}
              rows={3}
              defaultValue={product.description}
              className="w-full rounded-2xl bg-background px-3.5 py-2.5 focus-visible:outline-2 focus-visible:outline-berry"
            />
          </Field>
        </div>
        <Field label="Giá gốc (đ)" hint="giá của lựa chọn rẻ nhất; size lớn cộng thêm ở phần lựa chọn">
          <input name="basePriceVnd" type="number" min={0} step={1000} required defaultValue={product.basePriceVnd} className={fieldClass} />
        </Field>
        <Field label="Đặt trước bao lâu (giờ)">
          <input name="leadTimeHours" type="number" min={0} max={720} defaultValue={product.leadTimeHours} className={fieldClass} />
        </Field>
        <Field label="Công thức trong cookbook" hint="để tính giá vốn, không bắt buộc">
          <select name="recipeId" defaultValue={product.recipeId ?? ''} className={fieldClass}>
            <option value="">Không gắn</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Thứ tự trong nhóm">
          <input name="position" type="number" min={0} max={999} defaultValue={product.position} className={fieldClass} />
        </Field>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-[13px] font-bold">Màu nền (khi chưa có ảnh)</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Màu nền">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={tone === t}
                aria-label={t}
                onClick={() => setTone(t)}
                className={`size-9 rounded-xl ${tone === t ? 'outline-2 outline-offset-2 outline-berry' : ''}`}
                style={{ background: t }}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-2.5 text-sm">
        <label className="flex items-start gap-2.5">
          <input type="checkbox" name="isActive" defaultChecked={product.isActive} className="mt-0.5 size-4 accent-berry" />
          <span>
            <b>Đang bán</b> — hiện trên menu
          </span>
        </label>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" name="takesDeposit" defaultChecked={product.takesDeposit} className="mt-0.5 size-4 accent-berry" />
          <span>
            <b>Làm theo đơn, cọc 50%</b> — bánh kem, bánh viết chữ. Bỏ tick thì khách trả đủ khi đặt.
          </span>
        </label>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" name="featured" defaultChecked={product.featured} className="mt-0.5 size-4 accent-berry" />
          <span>
            <b>Nổi bật</b> — lên mục &quot;Bánh được yêu nhất&quot; ở trang chủ
          </span>
        </label>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" name="soldOut" checked={soldOut} onChange={(e) => setSoldOut(e.target.checked)} className="mt-0.5 size-4 accent-berry" />
          <span>
            <b>Tạm hết</b> — vẫn hiện trên menu nhưng không đặt được
          </span>
        </label>
        {soldOut && (
          <input name="soldOutNote" maxLength={120} defaultValue={product.soldOutNote ?? ''} placeholder="Hết mùa xoài, quay lại tháng 4" className={fieldClass} />
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{product.id ? 'Lưu thay đổi' : 'Tạo bánh'}</SubmitButton>
        <ActionResult state={state} />
      </div>
    </form>
  )
}
