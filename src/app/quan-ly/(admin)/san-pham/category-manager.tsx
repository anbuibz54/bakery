'use client'

import { useActionState, useState } from 'react'
import { ActionResult, Field, SubmitButton, fieldClass } from '@/components/admin-ui'
import { PRINT, StampIcon } from '@/components/stamp-icon'
import { Card } from '@/components/ui'
import { CATEGORY_ICONS, type Category } from '@/lib/catalog'
import { deleteCategoryAction, saveCategoryAction, type AdminState } from '../../_actions'

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [adding, setAdding] = useState(false)
  return (
    <div className="mt-3 flex flex-col gap-3">
      {categories.map((c) => (
        <CategoryRow key={`${c.slug}:${c.title}:${c.position}:${c.isActive}:${c.icon}`} category={c} />
      ))}
      {adding ? (
        <CategoryRow category={null} nextPosition={(categories.at(-1)?.position ?? -1) + 1} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="self-start rounded-full bg-surface px-4 py-2 text-sm font-bold text-berry shadow-[var(--shadow-soft)]">
          + Thêm loại bánh
        </button>
      )}
    </div>
  )
}

function CategoryRow({ category, nextPosition = 0, onDone }: { category: Category | null; nextPosition?: number; onDone?: () => void }) {
  const [state, save] = useActionState<AdminState, FormData>(saveCategoryAction, null)
  const [delState, remove] = useActionState<AdminState, FormData>(deleteCategoryAction, null)
  const [icon, setIcon] = useState<string>(category?.icon ?? 'cake')

  return (
    <Card className="flex flex-col gap-3">
      <form action={save} className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_90px]">
        {category && <input type="hidden" name="slug" value={category.slug} />}
        <input type="hidden" name="icon" value={icon} />
        <Field label="Tên trên menu">
          <input name="title" required maxLength={60} defaultValue={category?.title} placeholder="Bánh su kem" className={fieldClass} />
        </Field>
        <Field label="Tên ngắn (thanh đầu trang)">
          <input name="chip" maxLength={24} defaultValue={category?.chip} placeholder="Su kem" className={fieldClass} />
        </Field>
        <Field label="Thứ tự">
          <input name="position" type="number" min={0} max={99} defaultValue={category?.position ?? nextPosition} className={fieldClass} />
        </Field>
        <div className="sm:col-span-3">
          <Field label="Ghi chú dưới tên nhóm">
            <input name="note" maxLength={160} defaultValue={category?.note ?? ''} placeholder="Đặt trước 1 ngày" className={fieldClass} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-3" role="radiogroup" aria-label="Biểu tượng">
          {CATEGORY_ICONS.map((i) => (
            <button
              key={i.icon}
              type="button"
              role="radio"
              aria-checked={icon === i.icon}
              aria-label={i.label}
              title={i.label}
              onClick={() => setIcon(i.icon)}
              className={`flex size-11 items-center justify-center rounded-2xl ${icon === i.icon ? 'bg-blush outline-2 outline-berry' : 'bg-background'}`}
            >
              <StampIcon name={i.icon} size={28} print={PRINT.pink} />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={category?.isActive ?? true} className="size-4 accent-berry" />
            Đang hiện trên menu
          </label>
          <SubmitButton>{category ? 'Lưu' : 'Thêm loại'}</SubmitButton>
          {!category && (
            <button type="button" onClick={onDone} className="text-sm text-muted">
              Thôi
            </button>
          )}
          <ActionResult state={state} />
        </div>
      </form>
      {category && (
        <form action={remove} className="flex items-center gap-3">
          <input type="hidden" name="slug" value={category.slug} />
          <button type="submit" className="text-xs font-bold text-berry">
            Xoá loại này
          </button>
          <ActionResult state={delState} />
        </form>
      )}
    </Card>
  )
}
