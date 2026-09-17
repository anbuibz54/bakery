import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { StampIcon, type StampName } from './stamp-icon'

/** White rounded surface with the soft shadow. The base of most blocks. */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-3xl bg-surface p-4 shadow-[var(--shadow-soft)]', className)} {...props} />
}

export function BackLink({ href, label = 'Quay lại' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-[42px] items-center justify-center rounded-full bg-surface shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-berry"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  )
}

/** Back button, centred title, optional right slot — the header of inner pages. */
export function TitleBar({ back, title, right }: { back: string; title: string; right?: ReactNode }) {
  return (
    <header className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center py-3.5">
      <BackLink href={back} />
      <h1 className="text-center font-display text-lg font-bold">{title}</h1>
      <div className="flex justify-end">{right}</div>
    </header>
  )
}

/**
 * Stand-in for a product photo: the product's tone with its category stamp.
 * Swap for the real photo once `photo_key` is set.
 */
export function ProductArt({ tone, icon, className, size = 40 }: { tone: string; icon: StampName; className?: string; size?: number }) {
  return (
    <div className={cn('flex items-center justify-center', className)} style={{ background: tone }} aria-hidden="true">
      <StampIcon name={icon} size={size} print="rgb(255 255 255 / 0.7)" className="opacity-80" />
    </div>
  )
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn('font-display text-[22px] leading-tight font-bold text-balance', className)}>{children}</h2>
}

export const buttonClass =
  'inline-flex h-12 items-center justify-center rounded-full bg-berry px-6 font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry disabled:opacity-50'
