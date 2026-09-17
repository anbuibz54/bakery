import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { paymentView } from '@/server/payments/service'
import { PaymentLive } from './payment-live'

export const metadata: Metadata = {
  title: 'Thanh toán · Vibe Bánh',
  robots: { index: false },
}

/**
 * The VietQR payment page. Reached only through the order's unguessable
 * tracking token, so it needs no login and order codes cannot be enumerated.
 */
export default async function PaymentPage({ params }: PageProps<'/don/[token]/thanh-toan'>) {
  const { token } = await params
  const view = await paymentView(token)
  if (!view) notFound()

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-10">
      <PaymentLive token={token} initial={view} zaloUrl={process.env.SHOP_ZALO_URL ?? null} />
    </main>
  )
}
