'use client'

import { useActionState, useState } from 'react'
import { ActionResult, Field, SubmitButton, fieldClass } from '@/components/admin-ui'
import { Card } from '@/components/ui'
import type { Category } from '@/lib/catalog'
import { createFromRecipeAction, type AdminState } from '../../../_actions'
import { ProductForm } from '../product-form'

/**
 * Two ways in: from a cookbook recipe (name, blurb and costing link come with
 * it) or by hand. Either way the product starts hidden, so the owner can add a
 * photo and sizes before customers see it.
 */
export function NewProduct({ categories, recipes }: { categories: Category[]; recipes: { id: string; title: string; yieldLabel: string | null; servings: number }[] }) {
  const [mode, setMode] = useState<'recipe' | 'hand'>(recipes.length ? 'recipe' : 'hand')
  const [state, action] = useActionState<AdminState, FormData>(createFromRecipeAction, null)

  return (
    <div className="mt-3 flex flex-col gap-3">
      <div className="flex gap-2" role="tablist">
        {(
          [
            ['recipe', 'Từ công thức cookbook'],
            ['hand', 'Tự nhập'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`h-10 rounded-full px-4 text-sm ${mode === m ? 'bg-foreground font-bold text-white' : 'bg-surface shadow-[var(--shadow-soft)]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'recipe' ? (
        recipes.length === 0 ? (
          <Card className="text-sm text-muted">Chưa thấy công thức nào trong cookbook của bạn. Lưu công thức bên cookbook trước, hoặc chọn &quot;Tự nhập&quot;.</Card>
        ) : (
          <form action={action} className="flex flex-col gap-3">
            <Card className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Công thức" hint="tên, mô tả và phần tính giá vốn lấy từ công thức này">
                  <select name="recipeId" required className={fieldClass}>
                    <option value="">Chọn công thức</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                        {r.yieldLabel ? ` (${r.servings} ${r.yieldLabel})` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Loại">
                <select name="category" required className={fieldClass}>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Giá bán (đ)">
                <input name="basePriceVnd" type="number" min={0} step={1000} required placeholder="140000" className={fieldClass} />
              </Field>
              <label className="flex items-start gap-2.5 text-sm sm:col-span-2">
                <input type="checkbox" name="takesDeposit" className="mt-0.5 size-4 accent-berry" />
                <span>
                  <b>Làm theo đơn, cọc 50%</b> (bánh kem, bánh viết chữ)
                </span>
              </label>
            </Card>
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton pendingLabel="Đang tạo…">Tạo bánh từ công thức</SubmitButton>
              <ActionResult state={state} />
            </div>
            <p className="text-[13px] text-muted">Bánh mới tạo sẽ ẩn cho tới khi bạn bật &quot;Đang bán&quot; — thêm ảnh và size trước đã.</p>
          </form>
        )
      ) : (
        <ProductForm
          categories={categories}
          recipes={recipes}
          product={{
            name: '',
            category: categories[0]?.slug ?? '',
            summary: '',
            description: '',
            basePriceVnd: 0,
            leadTimeHours: 24,
            takesDeposit: false,
            featured: false,
            soldOutNote: null,
            tone: '#fde3ec',
            isActive: false,
            position: 50,
            recipeId: null,
          }}
        />
      )}
    </div>
  )
}
