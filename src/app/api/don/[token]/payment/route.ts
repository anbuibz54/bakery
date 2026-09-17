import { paymentView } from '@/server/payments/service'

/** Polled by the payment page every few seconds until the money arrives. */
export async function GET(_request: Request, { params }: RouteContext<'/api/don/[token]/payment'>) {
  const { token } = await params
  const view = await paymentView(token)
  if (!view) return Response.json({ error: 'not found' }, { status: 404 })
  return Response.json(view, { headers: { 'Cache-Control': 'no-store' } })
}
