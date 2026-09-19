'use client'

/**
 * The cart lives in this browser's localStorage: buying a cake needs no
 * account. It holds choices and display prices only — the server prices the
 * order again at checkout (src/server/checkout).
 */

import { useSyncExternalStore } from 'react'

export type CartLine = {
  key: string
  productId: string
  slug: string
  name: string
  /** "8–10 người · 18cm, Vani" — for display. */
  optionSummary: string
  optionIds: string[]
  cakeMessage?: string
  quantity: number
  unitPriceVnd: number
  takesDeposit: boolean
  leadTimeHours: number
  tone: string
  /** Product photo when there is one, for the cart row. */
  photoUrl?: string | null
}

export type Cart = {
  lines: CartLine[]
  /** Chosen on the cake page ("Đây là quà tặng"), carried to checkout. */
  gift: boolean
  /** Chosen on the cake page, preselected at checkout. */
  date: string | null
}

const KEY = 'vibe-banh-cart-v1'
const EMPTY: Cart = { lines: [], gift: false, date: null }
const listeners = new Set<() => void>()
let cached: { raw: string | null; cart: Cart } = { raw: null, cart: EMPTY }

function read(): Cart {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return cached.cart
  }
  if (raw === cached.raw) return cached.cart
  let cart = EMPTY
  try {
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && Array.isArray(parsed.lines)) cart = { ...EMPTY, ...parsed }
  } catch {
    // Corrupt: start over.
  }
  cached = { raw, cart }
  return cart
}

function write(cart: Cart) {
  const raw = JSON.stringify(cart)
  try {
    localStorage.setItem(KEY, raw)
  } catch {
    // Private mode or full: keep it in memory for this visit.
  }
  cached = { raw, cart }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => e.key === KEY && listener()
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Null until mounted, so server and first client render agree. */
export function useCart(): Cart | null {
  return useSyncExternalStore(subscribe, read, () => null)
}

export function cartCount(cart: Cart | null) {
  return cart?.lines.reduce((n, l) => n + l.quantity, 0) ?? 0
}

export const cartActions = {
  add(line: Omit<CartLine, 'key'>, extra?: { gift?: boolean; date?: string | null }) {
    const cart = read()
    const same = cart.lines.find(
      (l) => l.productId === line.productId && l.optionIds.join() === line.optionIds.join() && (l.cakeMessage ?? '') === (line.cakeMessage ?? ''),
    )
    const lines = same
      ? cart.lines.map((l) => (l === same ? { ...l, quantity: Math.min(20, l.quantity + line.quantity) } : l))
      : [...cart.lines, { ...line, key: crypto.randomUUID() }]
    write({ ...cart, lines, gift: extra?.gift ?? cart.gift, date: extra?.date ?? cart.date })
  },
  setQuantity(key: string, quantity: number) {
    const cart = read()
    const lines = quantity <= 0 ? cart.lines.filter((l) => l.key !== key) : cart.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(20, quantity) } : l))
    write({ ...cart, lines })
  },
  setGift(gift: boolean) {
    write({ ...read(), gift })
  },
  setDate(date: string | null) {
    write({ ...read(), date })
  },
  clear() {
    write(EMPTY)
  },
}
