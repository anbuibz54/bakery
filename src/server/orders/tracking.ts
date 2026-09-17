/**
 * The order's story for the no-login tracking page.
 *
 * No `next/*` imports.
 */

import { and, asc, eq } from 'drizzle-orm'
import { db } from '../db'
import { orderEvents, orderItems, orders } from '../db/schema'

export type Tracking = NonNullable<Awaited<ReturnType<typeof getTracking>>>

export async function getTracking(trackToken: string) {
  const [order] = await db
    .select({
      id: orders.id,
      code: orders.code,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      fulfillment: orders.fulfillment,
      scheduledFor: orders.scheduledFor,
      deliveryAddress: orders.deliveryAddress,
      recipientName: orders.recipientName,
      giftNote: orders.giftNote,
      hidePrice: orders.hidePrice,
      totalVnd: orders.totalVnd,
      depositVnd: orders.depositVnd,
      paidVnd: orders.paidVnd,
      paymentDueAt: orders.paymentDueAt,
    })
    .from(orders)
    .where(eq(orders.trackToken, trackToken))
  if (!order) return null

  const [items, events] = await Promise.all([
    db
      .select({ productName: orderItems.productName, options: orderItems.options, cakeMessage: orderItems.cakeMessage, quantity: orderItems.quantity })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id)),
    db
      .select({ status: orderEvents.status, message: orderEvents.message, photoKey: orderEvents.photoKey, createdAt: orderEvents.createdAt })
      .from(orderEvents)
      .where(and(eq(orderEvents.orderId, order.id), eq(orderEvents.visibleToCustomer, true)))
      .orderBy(asc(orderEvents.createdAt)),
  ])

  return {
    ...order,
    items: items.map((i) => ({ ...i, options: i.options as { group: string; label: string }[] })),
    events,
  }
}
