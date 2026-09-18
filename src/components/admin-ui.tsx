'use client'

import { useFormStatus } from 'react-dom'
import type { AdminState } from '@/app/quan-ly/_actions'
import { cn } from '@/lib/utils'

export function SubmitButton({ children, className, pendingLabel }: { children: React.ReactNode; className?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn('h-11 rounded-full bg-berry px-5 font-bold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry', className)}
    >
      {pending ? (pendingLabel ?? 'Đang lưu…') : children}
    </button>
  )
}

/** What the last action said. `ok` fades into a status line, `error` shouts. */
export function ActionResult({ state }: { state: AdminState }) {
  if (!state) return null
  return state.error ? (
    <p role="alert" className="rounded-2xl bg-blush px-4 py-2.5 text-sm font-bold text-berry">
      {state.error}
    </p>
  ) : (
    <p role="status" className="rounded-2xl bg-mint px-4 py-2.5 text-sm font-bold text-mint-ink">
      {state.ok}
    </p>
  )
}

export const fieldClass = 'h-11 w-full min-w-0 rounded-2xl bg-background px-3.5 focus-visible:outline-2 focus-visible:outline-berry'
export const labelClass = 'mb-1 block text-[13px] font-bold'

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}
