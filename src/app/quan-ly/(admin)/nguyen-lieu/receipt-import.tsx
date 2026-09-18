'use client'

import { useActionState } from 'react'
import { ActionResult, SubmitButton } from '@/components/admin-ui'
import { Card } from '@/components/ui'
import { formatVnd } from '@/lib/money'
import type { PendingLine } from '@/server/costing/receipts'
import { importReceiptPricesAction, type AdminState } from '../../_actions'

/**
 * Lines the owner marked "giá cho tiệm bánh" on a cookbook receipt, waiting to
 * become ingredient prices. Lines with a problem are shown but not selectable.
 */
export function ReceiptImport({ lines }: { lines: PendingLine[] }) {
  const [state, action] = useActionState<AdminState, FormData>(importReceiptPricesAction, null)
  if (lines.length === 0 && !state) return null

  return (
    <Card className="mt-3">
      <b>Giá từ hóa đơn bên cookbook</b>
      <p className="mt-0.5 text-[13px] text-muted">Những món bạn đánh dấu &quot;giá cho tiệm bánh&quot; khi chụp hóa đơn. Mỗi dòng chỉ nhập một lần.</p>
      {lines.length > 0 && (
        <form action={action} className="mt-2 flex flex-col gap-2">
          <ul className="flex flex-col divide-y divide-dashed divide-line text-sm">
            {lines.map((l) => (
              <li key={l.lineId} className="flex items-start gap-3 py-2">
                <input
                  type="checkbox"
                  name="lineId"
                  value={l.lineId}
                  defaultChecked={!l.problem}
                  disabled={Boolean(l.problem)}
                  aria-label={`Nhập giá ${l.name}`}
                  className="mt-1 size-4 accent-berry"
                />
                <span className="min-w-0 flex-1">
                  <b>{l.name}</b>
                  <span className="text-muted">
                    {' '}
                    · {l.quantity ?? '?'}
                    {l.unit ? ` ${l.unit}` : ''} · {l.store ?? 'không rõ nơi mua'} · {l.boughtOn.slice(8, 10)}/{l.boughtOn.slice(5, 7)}
                  </span>
                  <span className={`block text-xs ${l.problem ? 'font-bold text-berry' : 'text-muted'}`}>
                    {l.problem ?? (l.matchName ? `cập nhật giá của "${l.matchName}"` : 'nguyên liệu mới')}
                  </span>
                </span>
                <b className="whitespace-nowrap tabular-nums">{l.priceVnd != null ? formatVnd(l.priceVnd) : '—'}</b>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton pendingLabel="Đang nhập…">Nhập các dòng đã chọn</SubmitButton>
          </div>
        </form>
      )}
      <div className="mt-2">
        <ActionResult state={state} />
      </div>
    </Card>
  )
}
