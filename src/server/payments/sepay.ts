/**
 * SePay: watches the shop's bank account and reports every incoming transfer.
 *
 * The flow: the payment page shows a VietQR whose memo is the order code
 * ("VB123456"). The customer pays from any banking app. SePay sees the credit
 * on the account and POSTs a webhook; `recordTransaction` matches the memo to
 * the order. A scheduled reconcile reads SePay's transaction API in case a
 * webhook never arrived.
 *
 * Docs (checked 2026-09-17): developer.sepay.vn — sepay-webhooks/xac-thuc
 * (signature), sepay-webhooks/tich-hop-webhook (payload), sepay-api/v2
 * (transactions). SePay has no sandbox bank: test with their Test mode, or
 * `pnpm payments:simulate` locally.
 *
 * No `next/*` imports.
 */

import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

/** One incoming transfer, whichever path (webhook or API) reported it. */
export type BankTransaction = {
  /** SePay's transaction id — the dedupe key. */
  ref: string
  amountVnd: number
  incoming: boolean
  accountNumber: string | null
  /** SePay's own extraction of the payment code, when configured. */
  code: string | null
  content: string
  bankRef: string | null
  bank: string | null
  receivedAt: Date
  raw: unknown
}

/* -------------------------------------------------------------------------- */
/* Config                                                                      */
/* -------------------------------------------------------------------------- */

function env(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set — see .env.example (SePay section).`)
  return value
}

/** The account customers pay into, as shown on the payment page. */
export function shopAccount() {
  return {
    /** Bank short name for the QR service, e.g. "MBBank", "Vietcombank". */
    bankCode: env('SEPAY_BANK'),
    bankLabel: process.env.SEPAY_BANK_LABEL || env('SEPAY_BANK'),
    accountNumber: env('SEPAY_ACCOUNT_NUMBER'),
    accountName: process.env.SEPAY_ACCOUNT_NAME || null,
  }
}

/* -------------------------------------------------------------------------- */
/* Order code in the memo                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Configure the same shape in SePay (Công ty → Cấu hình chung → Cấu trúc mã
 * thanh toán): prefix "VB", 6 digits.
 */
export const ORDER_CODE_PREFIX = 'VB'
const CODE_IN_TEXT = /VB[\s.-]?(\d{6})(?!\d)/i

/**
 * Banks rewrite memos: upper-case them, prepend their own reference, swap
 * spaces for dots. Trust SePay's extracted `code` first, then search the text.
 */
export function orderCodeFrom(code: string | null, content: string): string | null {
  for (const text of [code ?? '', content]) {
    const m = CODE_IN_TEXT.exec(text)
    if (m) return `${ORDER_CODE_PREFIX}${m[1]}`
  }
  return null
}

/* -------------------------------------------------------------------------- */
/* Webhook                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * HMAC-SHA256 over `${X-SePay-Timestamp}.${raw body}`, sent as
 * `X-SePay-Signature: sha256=<hex>`. The raw body — re-serialising parsed JSON
 * changes the bytes and the signature stops matching.
 *
 * No freshness window on the timestamp: SePay retries for up to 5 hours, and a
 * replayed transaction is harmless because payments dedupe on SePay's id.
 */
export function verifyWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret = env('SEPAY_WEBHOOK_SECRET'),
): boolean {
  if (!signature || !timestamp) return false
  const given = signature.replace(/^sha256=/i, '').trim().toLowerCase()
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
  const a = Buffer.from(given, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Signs a body the way SePay does. For the local simulator and checks. */
export function signWebhook(rawBody: string, timestamp: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`
}

const webhookSchema = z.object({
  id: z.coerce.number().int(),
  gateway: z.string().nullish(),
  transactionDate: z.string(),
  accountNumber: z.string().nullish(),
  subAccount: z.string().nullish(),
  code: z.string().nullish(),
  content: z.string().nullish(),
  transferType: z.enum(['in', 'out']),
  transferAmount: z.coerce.number(),
  referenceCode: z.string().nullish(),
})

/** "2024-07-02 11:08:33" is bank time, i.e. Vietnam time. */
export function parseBankTime(value: string): Date {
  const iso = value.trim().replace(' ', 'T')
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}+07:00`)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export function parseWebhook(json: unknown): BankTransaction {
  const p = webhookSchema.parse(json)
  return {
    ref: String(p.id),
    amountVnd: Math.round(p.transferAmount),
    incoming: p.transferType === 'in',
    accountNumber: p.accountNumber || null,
    code: p.code || null,
    content: p.content ?? '',
    bankRef: p.referenceCode || null,
    bank: p.gateway || null,
    receivedAt: parseBankTime(p.transactionDate),
    raw: json,
  }
}

/* -------------------------------------------------------------------------- */
/* QR                                                                          */
/* -------------------------------------------------------------------------- */

/** SePay's free VietQR image. Any Vietnamese banking app scans it. */
export function qrImageUrl(amountVnd: number, memo: string): string {
  const { bankCode, accountNumber } = shopAccount()
  const q = new URLSearchParams({
    acc: accountNumber,
    bank: bankCode,
    amount: String(amountVnd),
    des: memo,
  })
  return `https://qr.sepay.vn/img?${q}`
}

/* -------------------------------------------------------------------------- */
/* Transactions API (reconcile)                                                */
/* -------------------------------------------------------------------------- */

const API = 'https://userapi.sepay.vn/v2'

const apiTransaction = z.object({
  id: z.coerce.string(),
  transaction_date: z.string(),
  account_number: z.string().nullish(),
  amount_in: z.coerce.number().nullish(),
  amount_out: z.coerce.number().nullish(),
  transaction_content: z.string().nullish(),
  reference_number: z.string().nullish(),
  bank_brand_name: z.string().nullish(),
  code: z.string().nullish(),
})

const apiPage = z.object({
  data: z.array(z.unknown()),
  meta: z.object({ has_more: z.boolean().optional() }).partial().optional(),
})

/**
 * Incoming transactions on or after `from` (a Vietnam date, YYYY-MM-DD).
 * Rate limit is 3 requests/second; a page a second stays well under it.
 */
export async function listTransactions(from: string, maxPages = 10): Promise<BankTransaction[]> {
  const token = env('SEPAY_API_TOKEN')
  const out: BankTransaction[] = []
  for (let page = 1; page <= maxPages; page++) {
    const url = `${API}/transactions?${new URLSearchParams({ transaction_date_from: from, page: String(page) })}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (!res.ok) throw new Error(`SePay transactions API ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const body = apiPage.parse(await res.json())
    for (const item of body.data) {
      const t = apiTransaction.safeParse(item)
      if (!t.success) continue
      const amountIn = t.data.amount_in ?? 0
      out.push({
        ref: t.data.id,
        amountVnd: Math.round(amountIn),
        incoming: amountIn > 0,
        accountNumber: t.data.account_number || null,
        code: t.data.code || null,
        content: t.data.transaction_content ?? '',
        bankRef: t.data.reference_number || null,
        bank: t.data.bank_brand_name || null,
        receivedAt: parseBankTime(t.data.transaction_date),
        raw: item,
      })
    }
    if (!body.meta?.has_more) break
    await new Promise((r) => setTimeout(r, 1000))
  }
  return out
}
