/**
 * Recording money that arrived, and what the payment page shows.
 *
 * Reliability rules (why this looks the way it does):
 *  - One row per bank transaction in `payments`, unique on SePay's id. A
 *    retried webhook, or the reconcile job reading the same transaction, hits
 *    the unique index and changes nothing.
 *  - The order row is locked (`FOR UPDATE`) while its total is recomputed from
 *    the ledger, so two transfers arriving together cannot both read the old
 *    sum.
 *  - Status is derived from the sum, never incremented.
 *
 * No `next/*` imports.
 */

import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db'
import { orderEvents, orders, payments } from '../db/schema'
import { log } from '../logger'
import { formatVnd } from '../../lib/money'
import { derivePaymentStatus, dueNowVnd, securesOrder, type PaymentStatus } from './status'
import { listTransactions, orderCodeFrom, qrImageUrl, shopAccount, type BankTransaction } from './sepay'

export type RecordOutcome =
  | { outcome: 'ignored'; reason: string }
  | { outcome: 'duplicate' }
  | { outcome: 'unmatched'; paymentId: string }
  | { outcome: 'credited'; paymentId: string; orderCode: string; paymentStatus: PaymentStatus }

export async function recordTransaction(
  tx: BankTransaction,
  source: 'webhook' | 'reconcile',
): Promise<RecordOutcome> {
  if (!tx.incoming || tx.amountVnd <= 0) return { outcome: 'ignored', reason: 'not incoming' }

  const shopAccountNumber = process.env.SEPAY_ACCOUNT_NUMBER
  if (shopAccountNumber && tx.accountNumber && tx.accountNumber !== shopAccountNumber) {
    return { outcome: 'ignored', reason: 'another account' }
  }

  const code = orderCodeFrom(tx.code, tx.content)

  const result = await db.transaction(async (trx) => {
    const [order] = code
      ? await trx.select().from(orders).where(eq(orders.code, code)).for('update')
      : []

    // The same bank transfer can surface under a second SePay id if an account
    // is re-linked; the bank's own reference catches that.
    if (tx.bankRef) {
      const [seen] = await trx
        .select({ id: payments.id })
        .from(payments)
        .where(and(eq(payments.provider, 'sepay'), eq(payments.bankRef, tx.bankRef), eq(payments.amountVnd, tx.amountVnd)))
        .limit(1)
      if (seen) return { outcome: 'duplicate' } as const
    }

    const [inserted] = await trx
      .insert(payments)
      .values({
        orderId: order?.id ?? null,
        provider: 'sepay',
        providerRef: tx.ref,
        amountVnd: tx.amountVnd,
        content: tx.content,
        bankRef: tx.bankRef,
        bank: tx.bank,
        receivedAt: tx.receivedAt,
        source,
        raw: tx.raw as object,
      })
      .onConflictDoNothing({ target: [payments.provider, payments.providerRef] })
      .returning({ id: payments.id })

    if (!inserted) return { outcome: 'duplicate' } as const
    if (!order) return { outcome: 'unmatched', paymentId: inserted.id } as const

    const [{ paid }] = await trx
      .select({ paid: sql<number>`coalesce(sum(${payments.amountVnd}), 0)::int` })
      .from(payments)
      .where(eq(payments.orderId, order.id))

    const totals = { paidVnd: paid, depositVnd: order.depositVnd, totalVnd: order.totalVnd }
    const paymentStatus = derivePaymentStatus(totals, order.paymentStatus)
    const confirms = order.status === 'pending' && securesOrder(paymentStatus)

    await trx
      .update(orders)
      .set({
        paidVnd: paid,
        paymentStatus,
        ...(confirms ? { status: 'confirmed' as const } : {}),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id))

    await trx.insert(orderEvents).values({
      orderId: order.id,
      status: confirms ? 'confirmed' : null,
      message: paymentMessage(tx.amountVnd, paymentStatus, totals),
    })

    return { outcome: 'credited', paymentId: inserted.id, orderCode: order.code, paymentStatus } as const
  })

  log.info('payment recorded', { source, ref: tx.ref, amountVnd: tx.amountVnd, code, ...result })
  return result
}

function paymentMessage(amount: number, status: PaymentStatus, t: { paidVnd: number; depositVnd: number; totalVnd: number }) {
  const got = `Tiệm đã nhận ${formatVnd(amount)}.`
  switch (status) {
    case 'paid':
      return `${got} Đơn đã thanh toán đủ.`
    case 'deposit_paid':
      return `${got} Lịch nướng của bạn đã được giữ. Còn ${formatVnd(t.totalVnd - t.paidVnd)} trả khi nhận bánh.`
    case 'underpaid':
      return `${got} Còn thiếu ${formatVnd(dueNowVnd(t))} tiền cọc — chuyển thêm hoặc nhắn Zalo tiệm nhé.`
    default:
      return got
  }
}

/**
 * Re-reads SePay's transaction list and records anything missing. Safe to run
 * any time, as often as wanted: already-recorded transactions are duplicates.
 */
export async function reconcileSepay({ days = 2 }: { days?: number } = {}) {
  const from = new Date(Date.now() - days * 86_400_000).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  const txs = await listTransactions(from)
  const counts = { seen: txs.length, credited: 0, unmatched: 0, duplicate: 0, ignored: 0 }
  for (const tx of txs) {
    const r = await recordTransaction(tx, 'reconcile')
    counts[r.outcome]++
  }
  if (counts.credited || counts.unmatched) log.warn('reconcile found payments the webhook missed', counts)
  return counts
}

/* -------------------------------------------------------------------------- */
/* Payment page                                                                */
/* -------------------------------------------------------------------------- */

export type PaymentView = NonNullable<Awaited<ReturnType<typeof paymentView>>>

/** Everything the payment page needs, found by the unguessable tracking token. */
export async function paymentView(trackToken: string) {
  const [order] = await db
    .select({
      code: orders.code,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      totalVnd: orders.totalVnd,
      depositVnd: orders.depositVnd,
      paidVnd: orders.paidVnd,
      paymentDueAt: orders.paymentDueAt,
    })
    .from(orders)
    .where(eq(orders.trackToken, trackToken))
  if (!order) return null

  const due = dueNowVnd(order)
  const account = shopAccount()
  return {
    code: order.code,
    cancelled: order.status === 'cancelled',
    paymentStatus: order.paymentStatus,
    totalVnd: order.totalVnd,
    depositVnd: order.depositVnd,
    paidVnd: order.paidVnd,
    dueNowVnd: due,
    remainingVnd: Math.max(0, order.totalVnd - order.paidVnd),
    isDeposit: order.depositVnd > 0 && order.depositVnd < order.totalVnd && order.paidVnd < order.depositVnd,
    paymentDueAt: order.paymentDueAt?.toISOString() ?? null,
    qrUrl: due > 0 ? qrImageUrl(due, order.code) : null,
    bank: account.bankLabel,
    accountNumber: account.accountNumber,
    accountName: account.accountName,
  }
}
