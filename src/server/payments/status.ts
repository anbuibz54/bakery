/**
 * Payment arithmetic. Pure functions, no database — `pnpm check:payments`
 * exercises them.
 *
 * The rule the shop sells by: custom cakes take a 50% deposit; ready-made
 * goods and the delivery fee are paid in full up front; the rest is paid when
 * the customer receives the cake.
 *
 * No `next/*` imports.
 */

export type PaymentStatus = 'unpaid' | 'underpaid' | 'deposit_paid' | 'paid' | 'refunded'

export type Totals = { paidVnd: number; depositVnd: number; totalVnd: number }

/** Deposits round up to a whole thousand, the way people type amounts. */
function halfRoundedUp(amount: number): number {
  return Math.ceil(amount / 2 / 1000) * 1000
}

export function depositFor(
  lines: { lineTotalVnd: number; takesDeposit: boolean }[],
  deliveryFeeVnd: number,
): number {
  const goods = lines.reduce(
    (sum, l) => sum + (l.takesDeposit ? halfRoundedUp(l.lineTotalVnd) : l.lineTotalVnd),
    0,
  )
  return goods + deliveryFeeVnd
}

/**
 * Status from money received — never set by hand. `refunded` is the one state
 * a person sets; a late transfer does not undo it.
 */
export function derivePaymentStatus(t: Totals, current?: PaymentStatus): PaymentStatus {
  if (current === 'refunded') return 'refunded'
  if (t.paidVnd <= 0) return 'unpaid'
  if (t.paidVnd >= t.totalVnd) return 'paid'
  if (t.depositVnd > 0 && t.paidVnd >= t.depositVnd) return 'deposit_paid'
  return 'underpaid'
}

/** What the payment page asks for right now: the rest of the deposit, else the rest of the total. */
export function dueNowVnd(t: Totals): number {
  if (t.paidVnd >= t.totalVnd) return 0
  if (t.depositVnd > 0 && t.paidVnd < t.depositVnd) return t.depositVnd - t.paidVnd
  return t.totalVnd - t.paidVnd
}

/** A payment that moves the order past this point confirms it. */
export function securesOrder(status: PaymentStatus): boolean {
  return status === 'deposit_paid' || status === 'paid'
}
