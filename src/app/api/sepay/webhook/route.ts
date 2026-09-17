import { log } from '@/server/logger'
import { parseWebhook, verifyWebhook } from '@/server/payments/sepay'
import { recordTransaction } from '@/server/payments/service'

/**
 * SePay calls this for every transaction on the shop's account.
 *
 * SePay counts a delivery as done only on 200/201 with `{"success": true}`
 * within 30 s, and retries otherwise (7 times over 5 hours). So: every
 * correctly signed request — duplicates and transfers that match no order
 * included — gets `success: true`; only a bad signature or a crash does not.
 */
export async function POST(request: Request) {
  const raw = await request.text()
  const ok = verifyWebhook(
    raw,
    request.headers.get('x-sepay-signature'),
    request.headers.get('x-sepay-timestamp'),
  )
  if (!ok) {
    log.warn('sepay webhook: bad signature')
    return Response.json({ success: false }, { status: 401 })
  }

  let tx
  try {
    tx = parseWebhook(JSON.parse(raw))
  } catch (error) {
    // Signed by SePay but not a shape we know: retrying will not fix it.
    log.error('sepay webhook: unreadable payload', { error, body: raw.slice(0, 500) })
    return Response.json({ success: true })
  }

  const result = await recordTransaction(tx, 'webhook')
  return Response.json({ success: true, outcome: result.outcome })
}
