/**
 * Placing an order. The checkout page (build order step 4) calls this; until
 * it exists, `pnpm payments:demo-order` does.
 *
 * No `next/*` imports.
 */

import { randomBytes, randomInt } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { customers, orderEvents, orderItems, orders } from '../db/schema'
import { depositFor } from '../payments/status'
import { ORDER_CODE_PREFIX } from '../payments/sepay'

/** How long an unpaid order holds its bake slot. The payment page counts down from it. */
export const PAYMENT_HOLD_MINUTES = 15

/** "0908 123 456", "+84 908123456", "84908123456" → "84908123456". */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = `84${digits.slice(1)}`
  return /^84\d{9}$/.test(digits) ? digits : null
}

export const orderInput = z.object({
  phone: z.string(),
  name: z.string().trim().max(80).optional(),
  fulfillment: z.enum(['pickup', 'delivery']),
  scheduledFor: z.coerce.date(),
  deliveryAddress: z.string().trim().max(300).optional(),
  deliveryFeeVnd: z.number().int().min(0).default(0),
  items: z
    .array(
      z.object({
        productId: z.string().uuid().optional(),
        productName: z.string().min(1),
        options: z.array(z.object({ group: z.string(), label: z.string(), priceDeltaVnd: z.number().int() })).default([]),
        cakeMessage: z.string().max(60).optional(),
        quantity: z.number().int().min(1).max(50),
        unitPriceVnd: z.number().int().min(0),
        /** Custom cakes take a deposit; ready-made goods are paid in full. */
        takesDeposit: z.boolean(),
      }),
    )
    .min(1),
  recipientName: z.string().trim().max(80).optional(),
  recipientPhone: z.string().optional(),
  giftNote: z.string().max(300).optional(),
  hidePrice: z.boolean().default(false),
  customerNote: z.string().max(500).optional(),
})
export type OrderInput = z.input<typeof orderInput>

function newCode() {
  return `${ORDER_CODE_PREFIX}${String(randomInt(0, 1_000_000)).padStart(6, '0')}`
}

function isUniqueViolation(error: unknown, index: string) {
  const e = error as { code?: string; constraint_name?: string; cause?: { code?: string; constraint_name?: string } }
  const c = e.cause ?? e
  return c.code === '23505' && c.constraint_name === index
}

export async function createOrder(raw: OrderInput) {
  const input = orderInput.parse(raw)
  const phone = normalizePhone(input.phone)
  if (!phone) throw new Error('Số điện thoại không hợp lệ.')

  const lines = input.items.map((i) => ({ ...i, lineTotalVnd: i.unitPriceVnd * i.quantity }))
  const subtotalVnd = lines.reduce((s, l) => s + l.lineTotalVnd, 0)
  const totalVnd = subtotalVnd + input.deliveryFeeVnd
  const depositVnd = depositFor(lines, input.deliveryFeeVnd)

  // A six-digit code collides eventually; retry rather than lengthen what
  // customers type into their banking app.
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.transaction(async (trx) => {
        const [customer] = await trx
          .insert(customers)
          .values({ phone, name: input.name })
          .onConflictDoUpdate({ target: customers.phone, set: input.name ? { name: input.name } : { phone } })
          .returning({ id: customers.id })

        const [order] = await trx
          .insert(orders)
          .values({
            code: newCode(),
            trackToken: randomBytes(18).toString('base64url'),
            customerId: customer.id,
            fulfillment: input.fulfillment,
            scheduledFor: input.scheduledFor,
            deliveryAddress: input.deliveryAddress,
            recipientName: input.recipientName,
            recipientPhone: input.recipientPhone ? normalizePhone(input.recipientPhone) : null,
            giftNote: input.giftNote,
            hidePrice: input.hidePrice,
            subtotalVnd,
            deliveryFeeVnd: input.deliveryFeeVnd,
            totalVnd,
            depositVnd,
            paymentDueAt: new Date(Date.now() + PAYMENT_HOLD_MINUTES * 60_000),
            customerNote: input.customerNote,
          })
          .returning({ id: orders.id, code: orders.code, trackToken: orders.trackToken })

        await trx.insert(orderItems).values(
          lines.map((l) => ({
            orderId: order.id,
            productId: l.productId,
            productName: l.productName,
            options: l.options,
            cakeMessage: l.cakeMessage,
            quantity: l.quantity,
            unitPriceVnd: l.unitPriceVnd,
            lineTotalVnd: l.lineTotalVnd,
          })),
        )
        await trx.insert(orderEvents).values({ orderId: order.id, status: 'pending', message: 'Tiệm đã nhận đơn của bạn.' })
        return { ...order, totalVnd, depositVnd }
      })
    } catch (error) {
      if (attempt < 4 && isUniqueViolation(error, 'orders_code_idx')) continue
      throw error
    }
  }
}

export async function findOrderByCode(code: string) {
  const [order] = await db.select().from(orders).where(eq(orders.code, code))
  return order ?? null
}
