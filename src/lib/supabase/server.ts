/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Next-aware on purpose (it reaches for `next/headers`), which is why it lives
 * in `src/lib/` and not `src/server/`: the service layer never imports
 * `next/*`, so the cookie plumbing stays here.
 *
 * Auth only. Shop data goes through `src/server`, never straight from a client
 * to Supabase.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot set cookies. Safe to swallow only because
          // proxy.ts refreshes the session on every admin request.
        }
      },
    },
  })
}
