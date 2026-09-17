'use client'

import { useEffect } from 'react'
import { cartActions } from '@/lib/cart'

/** Rendered once the order exists: the cart has become an order. */
export function ClearCart() {
  useEffect(() => cartActions.clear(), [])
  return null
}
