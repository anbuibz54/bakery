'use client'

import { useActionState, useState } from 'react'
import { ActionResult, Field, SubmitButton, fieldClass } from '@/components/admin-ui'
import { Card } from '@/components/ui'
import { addComponentAction, removeComponentAction, type AdminState } from '../../../_actions'

type Component = { id: string; label: string; detail: string; optionId: string | null }

/**
 * What this cake is made of: cookbook recipes (scaled) and single ingredients.
 * A component tied to an option only counts when that option is chosen, which
 * is how a 22cm cake costs more cream than a 14cm one.
 */
export function ComponentEditor({
  productId,
  components,
  options,
  recipes,
  ingredients,
}: {
  productId: string
  components: Component[]
  options: { id: string; label: string }[]
  recipes: { id: string; title: string; servings: number; yieldLabel: string | null }[]
  ingredients: { id: string; name: string; unit: string; isPackaging?: boolean }[]
}) {
  const [addState, add] = useActionState<AdminState, FormData>(addComponentAction, null)
  const [removeState, remove] = useActionState<AdminState, FormData>(removeComponentAction, null)
  const [kind, setKind] = useState<'recipe' | 'ingredient'>('recipe')

  return (
    <Card className="mt-3 flex flex-col gap-3">
      <b>Món này gồm những gì</b>

      {components.length === 0 ? (
        <p className="text-sm text-muted">Chưa khai thành phần nào, nên chưa tính được giá vốn.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-dashed divide-line text-sm">
          {components.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                <b>{c.label}</b>
                <span className="text-muted"> · {c.detail}</span>
                {c.optionId && <span className="text-muted"> · chỉ khi chọn {options.find((o) => o.id === c.optionId)?.label ?? 'tuỳ chọn'}</span>}
              </span>
              <form action={remove}>
                <input type="hidden" name="componentId" value={c.id} />
                <button type="submit" className="rounded-full bg-background px-3 py-1.5 text-[13px] font-bold text-berry">
                  Xoá
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <ActionResult state={removeState} />

      <form action={add} className="flex flex-col gap-3 rounded-2xl bg-background p-3">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="kind" value={kind} />
        <div className="flex gap-2">
          {(['recipe', 'ingredient'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`h-9 rounded-full px-3 text-sm ${kind === k ? 'bg-foreground font-bold text-white' : 'bg-surface'}`}
            >
              {k === 'recipe' ? 'Công thức từ cookbook' : 'Nguyên liệu / bao bì'}
            </button>
          ))}
        </div>

        {kind === 'recipe' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Công thức">
              <select name="recipeId" className={fieldClass} required>
                <option value="">Chọn công thức</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                    {r.yieldLabel ? ` (${r.servings} ${r.yieldLabel})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nhân mấy lần công thức" hint="1 = đúng công thức, 1,6 = gấp 1,6 lần">
              <input name="multiplier" type="number" step="0.1" min="0.1" max="50" defaultValue={1} className={fieldClass} />
            </Field>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nguyên liệu">
              <select name="ingredientId" className={fieldClass} required>
                <option value="">Chọn nguyên liệu</option>
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unit})
                    {i.isPackaging ? ' · bao bì' : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Số lượng" hint="theo đơn vị của nguyên liệu (g, ml, cái)">
              <input name="quantity" type="number" step="0.1" min="0.1" className={fieldClass} required />
            </Field>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tên hiển thị" hint="để trống thì lấy tên công thức">
            <input name="label" maxLength={80} className={fieldClass} />
          </Field>
          <Field label="Chỉ áp dụng khi chọn">
            <select name="optionId" className={fieldClass}>
              <option value="">Mọi size / lựa chọn</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <SubmitButton>Thêm thành phần</SubmitButton>
          <ActionResult state={addState} />
        </div>
      </form>
    </Card>
  )
}
