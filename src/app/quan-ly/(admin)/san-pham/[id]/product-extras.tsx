'use client'

import { useActionState, useState, useTransition } from 'react'
import { ActionResult, SubmitButton, fieldClass } from '@/components/admin-ui'
import { PRINT, StampIcon } from '@/components/stamp-icon'
import { Card } from '@/components/ui'
import { formatVnd } from '@/lib/money'
import { shrinkPhoto } from '@/lib/photo'
import {
  deleteProductAction,
  productPhotoAction,
  removeProductPhotoAction,
  saveOptionsAction,
  type AdminState,
} from '../../../_actions'

/* -------------------------------------------------------------------------- */
/* Photo                                                                       */
/* -------------------------------------------------------------------------- */

/** The photo is shrunk in the browser (phone photos are 3–5 MB) before upload. */
export function PhotoForm({ productId, photoUrl, tone }: { productId: string; photoUrl: string | null; tone: string }) {
  const [state, setState] = useState<AdminState>(null)
  const [removeState, remove] = useActionState<AdminState, FormData>(removeProductPhotoAction, null)
  const [pending, start] = useTransition()

  async function pick(file: File | undefined) {
    if (!file) return
    let blob: Blob
    try {
      blob = await shrinkPhoto(file)
    } catch {
      setState({ error: 'Không mở được ảnh này. Thử ảnh khác nhé.' })
      return
    }
    const form = new FormData()
    form.set('productId', productId)
    form.set('photo', blob, 'photo.jpg')
    start(async () => setState(await productPhotoAction(null, form)))
  }

  return (
    <Card className="flex flex-col gap-3">
      <b>Ảnh</b>
      <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl" style={{ background: tone }}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded photo from public Storage
          <img src={photoUrl} alt="Ảnh bánh" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-foreground/70">
            <StampIcon name="camera" size={40} print={PRINT.pink} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className={`flex h-11 cursor-pointer items-center rounded-full bg-berry px-5 font-bold text-white ${pending ? 'opacity-60' : ''}`}>
          {pending ? 'Đang tải lên…' : photoUrl ? 'Đổi ảnh' : 'Thêm ảnh'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={pending}
            onChange={(e) => {
              void pick(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
        {photoUrl && (
          <form action={remove}>
            <input type="hidden" name="productId" value={productId} />
            <button type="submit" className="h-11 rounded-full bg-background px-4 text-sm font-bold text-muted">
              Bỏ ảnh
            </button>
          </form>
        )}
      </div>
      <p className="text-xs text-muted">Ảnh ngang 4:3 hiện đẹp nhất trên menu. Chụp gần, đủ sáng.</p>
      <ActionResult state={state} />
      <ActionResult state={removeState} />
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Options                                                                     */
/* -------------------------------------------------------------------------- */

type Option = { id?: string; group: string; label: string; detail: string; priceDeltaVnd: number }

const PRESET_GROUPS = ['size', 'Cốt bánh', 'Vị', 'Nhân']

/**
 * Choices the customer picks on the product page. One choice per group; the
 * first option of a group is the default. "size" is drawn as big buttons
 * ("4–6 người · 14cm"), other groups as chips.
 */
export function OptionsEditor({ productId, basePriceVnd, options: initial }: { productId: string; basePriceVnd: number; options: Option[] }) {
  const [state, action] = useActionState<AdminState, FormData>(saveOptionsAction, null)
  const [options, setOptions] = useState<Option[]>(initial)
  const set = (i: number, patch: Partial<Option>) => setOptions(options.map((o, n) => (n === i ? { ...o, ...patch } : o)))
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= options.length) return
    const next = [...options]
    ;[next[i], next[j]] = [next[j], next[i]]
    setOptions(next)
  }

  return (
    <Card className="flex flex-col gap-3">
      <b>Size & lựa chọn</b>
      <p className="-mt-2 text-xs text-muted">
        Giá = giá gốc {formatVnd(basePriceVnd)} + phần cộng thêm. Nhóm &quot;size&quot; hiện thành nút lớn; lựa chọn đầu tiên của mỗi nhóm là mặc định.
      </p>

      {options.length === 0 && <p className="text-sm text-muted">Chưa có lựa chọn — khách đặt đúng một kiểu.</p>}
      <ul className="flex flex-col gap-2">
        {options.map((o, i) => (
          <li key={o.id ?? `new-${i}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 rounded-2xl bg-background p-2.5">
            <input
              aria-label="Nhóm"
              list="option-groups"
              value={o.group}
              onChange={(e) => set(i, { group: e.target.value })}
              placeholder="size"
              className={`${fieldClass} bg-surface`}
            />
            <input aria-label="Tên lựa chọn" value={o.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="8–10 người" className={`${fieldClass} bg-surface`} />
            <input aria-label="Chi tiết" value={o.detail} onChange={(e) => set(i, { detail: e.target.value })} placeholder="18cm (không bắt buộc)" className={`${fieldClass} bg-surface`} />
            <label className="relative">
              <span className="sr-only">Cộng thêm</span>
              <input
                type="number"
                step={1000}
                value={o.priceDeltaVnd}
                onChange={(e) => set(i, { priceDeltaVnd: Math.round(Number(e.target.value) || 0) })}
                className={`${fieldClass} bg-surface pr-16 text-right tabular-nums`}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">đ thêm</span>
            </label>
            <div className="col-span-2 flex items-center gap-2 text-xs">
              <span className="text-muted tabular-nums">= {formatVnd(basePriceVnd + o.priceDeltaVnd)}</span>
              <span className="flex-1" />
              <button type="button" onClick={() => move(i, -1)} aria-label="Lên trên" className="rounded-full bg-surface px-2.5 py-1">
                ↑
              </button>
              <button type="button" onClick={() => move(i, 1)} aria-label="Xuống dưới" className="rounded-full bg-surface px-2.5 py-1">
                ↓
              </button>
              <button type="button" onClick={() => setOptions(options.filter((_, n) => n !== i))} className="rounded-full bg-surface px-2.5 py-1 font-bold text-berry">
                Bỏ
              </button>
            </div>
          </li>
        ))}
      </ul>
      <datalist id="option-groups">
        {PRESET_GROUPS.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOptions([...options, { group: options.at(-1)?.group ?? 'size', label: '', detail: '', priceDeltaVnd: 0 }])}
          className="rounded-full bg-blush px-4 py-2 text-sm font-bold text-berry"
        >
          + Thêm lựa chọn
        </button>
        {options.length === 0 && (
          <button
            type="button"
            onClick={() =>
              setOptions([
                { group: 'size', label: '4–6 người', detail: '14cm', priceDeltaVnd: 0 },
                { group: 'size', label: '8–10 người', detail: '18cm', priceDeltaVnd: 100_000 },
                { group: 'size', label: '12–15 người', detail: '22cm', priceDeltaVnd: 240_000 },
              ])
            }
            className="rounded-full bg-background px-4 py-2 text-sm font-bold"
          >
            Dùng 3 size bánh kem mẫu
          </button>
        )}
      </div>

      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="options" value={JSON.stringify(options.map((o) => ({ ...o, detail: o.detail || undefined })))} />
        <SubmitButton>Lưu lựa chọn</SubmitButton>
        <ActionResult state={state} />
      </form>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Delete                                                                      */
/* -------------------------------------------------------------------------- */

export function DangerZone({ productId, timesOrdered }: { productId: string; timesOrdered: number }) {
  const [state, action] = useActionState<AdminState, FormData>(deleteProductAction, null)
  const [sure, setSure] = useState(false)
  if (timesOrdered > 0) {
    return <p className="text-xs text-muted">Bánh này đã có {timesOrdered} lượt đặt nên không xoá được — tắt &quot;Đang bán&quot; để ẩn.</p>
  }
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 text-sm">
      <input type="hidden" name="productId" value={productId} />
      {sure ? (
        <>
          <button type="submit" className="rounded-full bg-berry px-4 py-2 font-bold text-white">
            Xoá hẳn bánh này
          </button>
          <button type="button" onClick={() => setSure(false)} className="text-muted">
            Thôi
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setSure(true)} className="font-bold text-berry">
          Xoá bánh
        </button>
      )}
      <ActionResult state={state} />
    </form>
  )
}
