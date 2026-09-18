'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PRINT, StampIcon } from '@/components/stamp-icon'
import { buttonClass, Card } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

/**
 * Sign-in happens in the browser so the Supabase client writes its own cookies;
 * the server then checks the owner allowlist on every admin page.
 */
export function SignInForm({ next }: { next?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Sai email hoặc mật khẩu.' : 'Chưa đăng nhập được, thử lại nhé.')
      return
    }
    router.replace(next?.startsWith('/quan-ly') ? next : '/quan-ly')
    router.refresh()
  }

  return (
    <Card className="flex flex-col gap-4 px-6 py-8">
      <div className="flex items-center gap-3">
        <StampIcon name="house" size={40} print={PRINT.pink} />
        <div>
          <h1 className="font-display text-xl font-bold">Vibe Bánh · quản lý</h1>
          <p className="text-[13px] text-muted">Chỉ chủ tiệm đăng nhập được.</p>
        </div>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-bold">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-2xl bg-background px-3.5 focus-visible:outline-2 focus-visible:outline-berry"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-bold">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-2xl bg-background px-3.5 focus-visible:outline-2 focus-visible:outline-berry"
          />
        </div>
        {error && (
          <p role="alert" className="rounded-2xl bg-blush px-4 py-3 text-sm font-bold text-berry">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className={`${buttonClass} w-full`}>
          {busy ? 'Đang vào…' : 'Vào trang quản lý'}
        </button>
      </form>
    </Card>
  )
}
