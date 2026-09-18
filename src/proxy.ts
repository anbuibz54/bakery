/**
 * Session refresh for the admin area.
 *
 * NOTE: this file is `proxy.ts`, not `middleware.ts` — the middleware file
 * convention is deprecated in Next.js 16. Every Supabase guide still shows
 * `middleware.ts`; that form no longer applies here.
 *
 * Two jobs:
 *  1. Refresh the auth token and write the rotated cookie (Server Components
 *     cannot set cookies, so without this sessions expire silently).
 *  2. Send signed-out visitors from `/quan-ly` to the sign-in page. This is an
 *     OPTIMISTIC check, not the security boundary — that is `requireOwner()`
 *     in `src/lib/auth/owner.ts`, which also checks the allowlist.
 *
 * The storefront is public and never touches this.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SIGN_IN = '/quan-ly/dang-nhap'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const signedIn = Boolean(user?.email)

  if (!signedIn && pathname.startsWith('/quan-ly') && pathname !== SIGN_IN) {
    const url = request.nextUrl.clone()
    url.pathname = SIGN_IN
    url.search = ''
    url.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  // Only the admin area needs a session; the storefront must stay cheap.
  matcher: ['/quan-ly/:path*'],
}
