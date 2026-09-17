import { timingSafeEqual } from 'node:crypto'
import { reconcileSepay } from '@/server/payments/service'

/**
 * Catches transfers whose webhook never arrived. Meant for a schedule
 * (Supabase pg_cron → pg_net, like the cookbook's reminders), with
 * `Authorization: Bearer <CRON_SECRET>`. Idempotent.
 */
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization') ?? ''
  if (!secret || !header.startsWith('Bearer ')) return false
  const given = Buffer.from(header.slice(7))
  const expected = Buffer.from(secret)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function POST(request: Request) {
  if (!authorized(request)) return new Response('Unauthorized', { status: 401 })
  return Response.json(await reconcileSepay())
}
