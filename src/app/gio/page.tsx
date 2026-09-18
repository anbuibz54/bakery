import type { Metadata } from 'next'
import { connection } from 'next/server'
import { SiteFooter, SiteHeader, SitePage } from '@/components/site-chrome'
import { TitleBar } from '@/components/ui'
import { bookingCalendar } from '@/server/schedule/service'
import { CheckoutForm } from './checkout-form'

export const metadata: Metadata = { title: 'Giỏ bánh', robots: { index: false } }

export default async function CartPage() {
  await connection()
  const calendar = await bookingCalendar()
  return (
    <SitePage>
      <div className="hidden md:block">
        <SiteHeader />
      </div>
      <div className="md:hidden">
        <TitleBar back="/menu" title="Giỏ bánh" />
      </div>
      <h1 className="hidden font-display text-3xl font-bold md:mt-2 md:mb-4 md:block">Giỏ bánh</h1>
      <CheckoutForm calendar={calendar} />
      <SiteFooter />
    </SitePage>
  )
}
