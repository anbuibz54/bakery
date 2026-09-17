import type { Metadata } from 'next'
import { connection } from 'next/server'
import { TitleBar } from '@/components/ui'
import { bookingCalendar } from '@/server/schedule/service'
import { CheckoutForm } from './checkout-form'

export const metadata: Metadata = { title: 'Giỏ bánh · Vibe Bánh', robots: { index: false } }

export default async function CartPage() {
  await connection()
  const calendar = await bookingCalendar()
  return (
    <main className="mx-auto w-full max-w-md px-5 pb-10">
      <TitleBar back="/menu" title="Giỏ bánh" />
      <CheckoutForm calendar={calendar} />
    </main>
  )
}
