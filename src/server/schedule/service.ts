/**
 * Which days and time slots can still take an order.
 *
 * An order holds a slot while it is alive: not cancelled, and either paid
 * something or still inside its 15-minute payment hold. An abandoned checkout
 * frees its slot by itself when the hold runs out — no cleanup job needed.
 *
 * No `next/*` imports.
 */

import { and, gte, lt, ne, or, sql } from 'drizzle-orm'
import { db } from '../db'
import { orders } from '../db/schema'
import { addDays, longDay, shortDay, vnDate, vnHour, vnInstant } from '../../lib/dates'
import { BOOKING_DAYS, ORDERS_PER_DAY, ORDERS_PER_SLOT, SLOTS } from '../../lib/shop'
import type { DayAvailability } from '../../lib/availability'

/** Live orders per (date, start hour) in the booking window. */
async function bookedCounts(from: string, to: string) {
  const now = new Date()
  const rows = await db
    .select({ scheduledFor: orders.scheduledFor, n: sql<number>`count(*)::int` })
    .from(orders)
    .where(
      and(
        gte(orders.scheduledFor, vnInstant(from, 0)),
        lt(orders.scheduledFor, vnInstant(to, 0)),
        ne(orders.status, 'cancelled'),
        or(ne(orders.paymentStatus, 'unpaid'), gte(orders.paymentDueAt, now)),
      ),
    )
    .groupBy(orders.scheduledFor)

  const byDay = new Map<string, number>()
  const bySlot = new Map<string, number>()
  for (const r of rows) {
    const date = vnDate(r.scheduledFor)
    byDay.set(date, (byDay.get(date) ?? 0) + r.n)
    const key = `${date}|${vnHour(r.scheduledFor)}`
    bySlot.set(key, (bySlot.get(key) ?? 0) + r.n)
  }
  return { byDay, bySlot }
}

/** The booking calendar from tomorrow-ish onwards. Lead time is applied by `canReceive`. */
export async function bookingCalendar(): Promise<DayAvailability[]> {
  const today = vnDate()
  const end = addDays(today, BOOKING_DAYS + 1)
  const { byDay, bySlot } = await bookedCounts(today, end)

  return Array.from({ length: BOOKING_DAYS + 1 }, (_, i) => {
    const date = addDays(today, i)
    return {
      date,
      short: shortDay(date),
      long: longDay(date),
      left: Math.max(0, ORDERS_PER_DAY - (byDay.get(date) ?? 0)),
      slots: SLOTS.map((s) => ({
        id: s.id,
        label: s.label,
        startsAt: vnInstant(date, s.startHour).toISOString(),
        left: Math.max(0, ORDERS_PER_SLOT - (bySlot.get(`${date}|${s.startHour}`) ?? 0)),
      })),
    }
  })
}
