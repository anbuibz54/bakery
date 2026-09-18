import 'server-only'

/**
 * Who may open `/quan-ly`.
 *
 * This is the real authorization boundary — `proxy.ts` only does an optimistic
 * redirect and can be bypassed. Every admin page, action and route handler
 * calls `requireOwner()`.
 *
 * The Supabase project is shared with LifeOS and the cookbook, so a signed-in
 * account is not automatically this shop's owner: `OWNER_EMAILS` (comma
 * separated) is the allowlist. Unset = no one gets in, which is the safe way
 * to fail when the environment is misconfigured.
 */

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Owner = { id: string; email: string }

function allowlist() {
  return (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export const getOwner = cache(async (): Promise<Owner | null> => {
  const supabase = await createClient()
  // getUser(), not getSession(): getSession trusts the cookie without checking it.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase()
  if (!user || !email) return null
  return allowlist().includes(email) ? { id: user.id, email } : null
})

export const requireOwner = cache(async (): Promise<Owner> => {
  const owner = await getOwner()
  if (!owner) redirect('/quan-ly/dang-nhap')
  return owner
})
