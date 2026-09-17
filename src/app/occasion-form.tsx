'use client'

import { useActionState, useState } from 'react'
import { StampIcon, PRINT } from '@/components/stamp-icon'
import { saveOccasionAction, type OccasionState } from './_actions/shop'

const field = 'h-11 min-w-0 rounded-full bg-surface px-4 text-sm placeholder:text-[#8AA0AD] focus-visible:outline-2 focus-visible:outline-berry'

/** "Đừng để lỡ ngày quan trọng": save a birthday, get a Zalo nudge 7 days before. */
export function OccasionForm() {
  const [state, action, pending] = useActionState<OccasionState, FormData>(saveOccasionAction, null)
  const [open, setOpen] = useState(false)
  // Controlled, because React resets a form after its action runs — an error would wipe what was typed.
  const [v, setV] = useState({ personName: '', date: '', phone: '', consent: false })

  return (
    <section className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-2.5 rounded-[28px] bg-sky px-5 py-[18px]">
      <div>
        <h2 className="font-display text-[19px] leading-tight font-bold">Đừng để lỡ ngày quan trọng</h2>
        <p className="mt-1.5 text-sm text-[#3F5563]">Lưu sinh nhật, tiệm nhắn Zalo trước 7 ngày kèm gợi ý bánh.</p>
      </div>
      <StampIcon name="calendar" size={60} print={PRINT.lemon} />

      {state?.ok ? (
        <p role="status" className="col-span-full rounded-2xl bg-surface px-4 py-3 text-sm">
          {state.message}
        </p>
      ) : (
        <form action={action} className="col-span-full flex flex-col gap-2" onFocus={() => setOpen(true)}>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="occ-person">Sinh nhật của ai</label>
            <input id="occ-person" name="personName" value={v.personName} onChange={(e) => setV({ ...v, personName: e.target.value })} required maxLength={80} placeholder="Mẹ" className={`${field} flex-1`} />
            <label className="sr-only" htmlFor="occ-date">Ngày (ngày/tháng)</label>
            <input id="occ-date" name="date" value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} required inputMode="numeric" placeholder="12/10" className={`${field} w-24 flex-none`} />
            {!open && (
              <button type="button" onClick={() => setOpen(true)} className="h-11 flex-none rounded-full bg-foreground px-[18px] font-bold text-white">
                Lưu
              </button>
            )}
          </div>
          {open && (
            <>
              <label className="sr-only" htmlFor="occ-phone">Số điện thoại Zalo của bạn</label>
              <input id="occ-phone" name="phone" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} required type="tel" inputMode="tel" autoComplete="tel" placeholder="Số Zalo của bạn" className={`${field} w-full`} />
              <label className="flex items-start gap-2 text-[13px] text-[#3F5563]">
                <input type="checkbox" name="consent" checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} required className="mt-0.5 size-4 accent-berry" />
                Tôi đồng ý để tiệm lưu ngày này và số điện thoại để nhắn nhắc. Một tin mỗi năm, tắt lúc nào cũng được.
              </label>
              {state && !state.ok && (
                <p role="alert" className="text-sm font-bold text-berry">
                  {state.message}
                </p>
              )}
              <button type="submit" disabled={pending} className="h-11 rounded-full bg-foreground font-bold text-white disabled:opacity-60">
                {pending ? 'Đang lưu…' : 'Lưu ngày này'}
              </button>
            </>
          )}
        </form>
      )}
    </section>
  )
}
