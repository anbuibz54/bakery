/**
 * Sends a signed SePay-style webhook, as if a transfer arrived.
 *
 *   pnpm payments:simulate VB123456 385000 [url] [--id 123] [--bad-signature]
 *
 * The same --id twice = SePay retrying one transaction.
 */
import { randomInt } from 'node:crypto'
import { signWebhook } from '../src/server/payments/sepay.ts'

const args = process.argv.slice(2)
const idAt = args.indexOf('--id')
const id = idAt === -1 ? randomInt(1, 2 ** 31) : Number(args.splice(idAt, 2)[1])
const bad = args.includes('--bad-signature')
const [code, amount, url = 'http://localhost:3200/api/sepay/webhook'] = args.filter((a) => !a.startsWith('--'))
if (!code || !amount) {
  console.log('usage: pnpm payments:simulate <memo> <amount> [url] [--id n] [--bad-signature]')
  process.exit(1)
}

// Bank time is Vietnam time, "YYYY-MM-DD HH:mm:ss".
const now = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 19).replace('T', ' ')
const body = JSON.stringify({
  id,
  gateway: process.env.SEPAY_BANK ?? 'MBBank',
  transactionDate: now,
  accountNumber: process.env.SEPAY_ACCOUNT_NUMBER ?? '',
  subAccount: '',
  code: null,
  content: `NGUYEN VAN A ${code} chuyen tien`,
  transferType: 'in',
  transferAmount: Number(amount),
  accumulated: 0,
  referenceCode: `FT${id}`,
  description: '',
})
const ts = String(Math.floor(Date.now() / 1000))
const secret = bad ? 'wrong-secret' : process.env.SEPAY_WEBHOOK_SECRET!
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-SePay-Signature': signWebhook(body, ts, secret),
    'X-SePay-Timestamp': ts,
  },
  body,
})
console.log(res.status, await res.text(), `(id ${id})`)
