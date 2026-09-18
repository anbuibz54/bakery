'use client'

/**
 * Where this visitor came from, remembered once per browser (first touch), so
 * the dashboard can report profit per channel.
 *
 * Only the channel name is kept — no ids, no tracking pixels, nothing sent
 * anywhere until the visitor places an order.
 */

export type Channel = 'instagram' | 'facebook' | 'tiktok' | 'direct' | 'other'

const KEY = 'vibe-banh-channel'

function fromText(value: string): Channel | null {
  const v = value.toLowerCase()
  if (v.includes('instagram') || v === 'ig') return 'instagram'
  if (v.includes('facebook') || v.includes('messenger') || v === 'fb' || v.includes('m.me')) return 'facebook'
  if (v.includes('tiktok')) return 'tiktok'
  return null
}

/** Call once on the storefront. Keeps the first channel seen. */
export function rememberChannel() {
  try {
    if (localStorage.getItem(KEY)) return
    const params = new URLSearchParams(location.search)
    const tagged = params.get('utm_source') || params.get('ref') || params.get('fbclid') ? 'facebook' : null
    const channel =
      fromText(params.get('utm_source') ?? '') ??
      fromText(params.get('ref') ?? '') ??
      (tagged as Channel | null) ??
      fromText(document.referrer) ??
      (document.referrer ? 'other' : 'direct')
    localStorage.setItem(KEY, channel)
  } catch {
    // Private mode: the order just counts as direct.
  }
}

export function currentChannel(): Channel {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'instagram' || value === 'facebook' || value === 'tiktok' || value === 'other' ? value : 'direct'
  } catch {
    return 'direct'
  }
}
