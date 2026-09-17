'use client'

import Link from 'next/link'
import { cartCount, useCart } from '@/lib/cart'

export function CartButton() {
  const count = cartCount(useCart())
  return (
    <Link
      href="/gio"
      aria-label={count ? `Giỏ bánh, ${count} món` : 'Giỏ bánh'}
      className="relative flex size-[42px] items-center justify-center rounded-full bg-surface shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-berry"
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 8h14l-1.3 11.5H6.3z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
      </svg>
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-berry text-[10px] font-bold text-white tabular-nums">
          {count}
        </span>
      )}
    </Link>
  )
}
