'use client'

import { useEffect } from 'react'
import { rememberChannel } from '@/lib/channel'

/** Storefront only: note the first channel this browser arrived from. */
export function RememberChannel() {
  useEffect(rememberChannel, [])
  return null
}
