import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getOwner } from '@/lib/auth/owner'
import { SignInForm } from './sign-in-form'

export const metadata: Metadata = { title: 'Đăng nhập', robots: { index: false } }

export default async function SignInPage({ searchParams }: PageProps<'/quan-ly/dang-nhap'>) {
  const { next } = await searchParams
  if (await getOwner()) redirect(typeof next === 'string' && next.startsWith('/quan-ly') ? next : '/quan-ly')
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
      <SignInForm next={typeof next === 'string' ? next : undefined} />
    </main>
  )
}
