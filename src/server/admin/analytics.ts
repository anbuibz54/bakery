/**
 * The numbers behind the dashboard.
 *
 * Every figure comes from rows this app wrote: revenue from orders, cost from
 * the snapshot on `order_items`, channel from `orders.channel`. Where a figure
 * cannot be computed (an order whose lines were never costed), it is reported
 * as unknown instead of being filled in with an estimate.
 *
 * "So với tiệm khác" is deliberately manual: `benchmarks` and
 * `competitor_prices` hold what the owner (or Claude, with a source) entered.
 * Nothing here scrapes or guesses another shop's numbers.
 *
 * No `next/*` imports.
 */

import { and, asc, desc, eq, gte, lt, ne, sql } from 'drizzle-orm'
import { db } from '../db'
import { benchmarks, competitorPrices, occasions, orderItems, orders, products } from '../db/schema'
import { addDays, vnDate, vnHour, vnInstant } from '../../lib/dates'
import { ORDERS_PER_DAY, SLOTS } from '../../lib/shop'
import { feePerOrderVnd, getSettings } from '../costing/service'

export type Period = { from: string; to: string; label: string }

/** `weeks` back from today, in whole Vietnam days. `to` is exclusive. */
export function lastDays(days: number, label: string): Period {
  const to = addDays(vnDate(), 1)
  return { from: addDays(to, -days), to, label }
}

type OrderRow = {
  id: string
  code: string
  createdAt: Date
  scheduledFor: Date
  status: string
  totalVnd: number
  deliveryFeeVnd: number
  channel: string
  fulfillment: string
  hidePrice: boolean
  customerId: string
  paymentStatus: string
}

async function ordersBetween(period: Period): Promise<OrderRow[]> {
  return db
    .select({
      id: orders.id,
      code: orders.code,
      createdAt: orders.createdAt,
      scheduledFor: orders.scheduledFor,
      status: orders.status,
      totalVnd: orders.totalVnd,
      deliveryFeeVnd: orders.deliveryFeeVnd,
      channel: orders.channel,
      fulfillment: orders.fulfillment,
      hidePrice: orders.hidePrice,
      customerId: orders.customerId,
      paymentStatus: orders.paymentStatus,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, vnInstant(period.from, 0)), lt(orders.createdAt, vnInstant(period.to, 0))))
    .orderBy(asc(orders.createdAt))
}

async function itemsFor(orderIds: string[]) {
  if (orderIds.length === 0) return []
  return db
    .select({
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      lineTotalVnd: orderItems.lineTotalVnd,
      unitCostVnd: orderItems.unitCostVnd,
    })
    .from(orderItems)
    .where(sql`${orderItems.orderId} in ${sql.raw(`(${orderIds.map((id) => `'${id}'`).join(',')})`)}`)
}

export type Totals = {
  orders: number
  revenueVnd: number
  aovVnd: number
  /** Null when no order in the period could be costed. */
  costVnd: number | null
  profitVnd: number | null
  marginPct: number | null
  /** Share of revenue whose lines carry a cost snapshot — how much to trust margin. */
  costedShare: number
  abandoned: number
  capacityPct: number
}

function summarise(rows: OrderRow[], items: Awaited<ReturnType<typeof itemsFor>>, feeVnd: number, deliverySubsidyVnd: number, days: number): Totals {
  const live = rows.filter((o) => o.status !== 'cancelled' && !(o.status === 'pending' && o.paymentStatus === 'unpaid'))
  const revenueVnd = live.reduce((s, o) => s + o.totalVnd, 0)

  let costVnd = 0
  let costedRevenue = 0
  for (const o of live) {
    const own = items.filter((i) => i.orderId === o.id)
    const complete = own.length > 0 && own.every((i) => i.unitCostVnd != null)
    if (!complete) continue
    costedRevenue += o.totalVnd
    costVnd += own.reduce((s, i) => s + (i.unitCostVnd ?? 0) * i.quantity, 0) + feeVnd + (o.fulfillment === 'delivery' ? deliverySubsidyVnd : 0)
  }

  const costedShare = revenueVnd > 0 ? costedRevenue / revenueVnd : 0
  const profitVnd = costedRevenue > 0 ? costedRevenue - costVnd : null
  return {
    orders: live.length,
    revenueVnd,
    aovVnd: live.length ? Math.round(revenueVnd / live.length) : 0,
    costVnd: costedRevenue > 0 ? Math.round(costVnd) : null,
    profitVnd: profitVnd != null ? Math.round(profitVnd) : null,
    marginPct: profitVnd != null && costedRevenue > 0 ? profitVnd / costedRevenue : null,
    costedShare,
    abandoned: rows.filter((o) => o.status === 'pending' && o.paymentStatus === 'unpaid').length,
    capacityPct: days > 0 ? live.length / (days * ORDERS_PER_DAY) : 0,
  }
}

export type ChannelRow = { channel: string; orders: number; revenueVnd: number; profitVnd: number | null; marginPct: number | null }

export type Dashboard = Awaited<ReturnType<typeof dashboard>>

export async function dashboard(days = 7) {
  const settings = await getSettings()
  const feeVnd = await feePerOrderVnd(settings)
  const period = lastDays(days, days === 7 ? 'Tuần này' : `${days} ngày`)
  const previous: Period = { from: addDays(period.from, -days), to: period.from, label: 'kỳ trước' }

  const [rows, prevRows] = await Promise.all([ordersBetween(period), ordersBetween(previous)])
  const [items, prevItems] = await Promise.all([itemsFor(rows.map((r) => r.id)), itemsFor(prevRows.map((r) => r.id))])

  const now = summarise(rows, items, feeVnd, settings.deliverySubsidyVnd, days)
  const before = summarise(prevRows, prevItems, feeVnd, settings.deliverySubsidyVnd, days)

  /* Channels: revenue and profit per source. */
  const live = rows.filter((o) => o.status !== 'cancelled' && !(o.status === 'pending' && o.paymentStatus === 'unpaid'))
  const channels: ChannelRow[] = [...new Set(live.map((o) => o.channel))].map((channel) => {
    const own = live.filter((o) => o.channel === channel)
    const revenueVnd = own.reduce((s, o) => s + o.totalVnd, 0)
    let costed = 0
    let cost = 0
    for (const o of own) {
      const lines = items.filter((i) => i.orderId === o.id)
      if (lines.length === 0 || lines.some((i) => i.unitCostVnd == null)) continue
      costed += o.totalVnd
      cost += lines.reduce((s, i) => s + (i.unitCostVnd ?? 0) * i.quantity, 0) + feeVnd + (o.fulfillment === 'delivery' ? settings.deliverySubsidyVnd : 0)
    }
    return {
      channel,
      orders: own.length,
      revenueVnd,
      profitVnd: costed > 0 ? Math.round(costed - cost) : null,
      marginPct: costed > 0 ? (costed - cost) / costed : null,
    }
  }).sort((a, b) => b.revenueVnd - a.revenueVnd)

  /* Weekly trend, eight buckets. */
  const trend = await db.execute<{ week: string; revenue: number; orders: number }>(sql`
    select to_char(date_trunc('week', created_at at time zone 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') as week,
           sum(total_vnd)::int as revenue, count(*)::int as orders
    from bakery.orders
    where status <> 'cancelled' and not (status = 'pending' and payment_status = 'unpaid')
      and created_at > now() - interval '8 weeks'
    group by 1 order by 1
  `)

  /* Menu matrix: sold and margin per product over four weeks. */
  const menuRows = await db.execute<{ product_id: string | null; name: string; sold: number; revenue: number; cost: number | null }>(sql`
    select i.product_id, max(i.product_name) as name,
           sum(i.quantity)::int as sold,
           sum(i.line_total_vnd)::int as revenue,
           case when bool_and(i.unit_cost_vnd is not null) then sum(i.unit_cost_vnd * i.quantity)::int else null end as cost
    from bakery.order_items i
    join bakery.orders o on o.id = i.order_id
    where o.status <> 'cancelled' and not (o.status = 'pending' and o.payment_status = 'unpaid')
      and o.created_at > now() - interval '4 weeks'
    group by i.product_id order by sold desc
  `)
  const menu = menuRows.map((r) => ({
    productId: r.product_id,
    name: r.name,
    sold: r.sold,
    revenueVnd: r.revenue,
    marginPct: r.cost != null && r.revenue > 0 ? (r.revenue - r.cost) / r.revenue : null,
  }))

  /* Slot heatmap over four weeks: share of capacity taken. */
  const slotRows = await db
    .select({ scheduledFor: orders.scheduledFor })
    .from(orders)
    .where(and(ne(orders.status, 'cancelled'), gte(orders.scheduledFor, vnInstant(addDays(vnDate(), -28), 0))))
  const heat = SLOTS.map((slot) => ({
    slot: slot.label,
    days: Array.from({ length: 7 }, (_, weekday) => {
      const n = slotRows.filter((r) => {
        const d = new Date(`${vnDate(r.scheduledFor)}T00:00:00Z`).getUTCDay()
        return d === weekday && vnHour(r.scheduledFor) === slot.startHour
      }).length
      return n
    }),
  }))

  /* Known demand ahead. */
  const [{ booked, bookedRevenue }] = await db
    .select({ booked: sql<number>`count(*)::int`, bookedRevenue: sql<number>`coalesce(sum(${orders.totalVnd}), 0)::int` })
    .from(orders)
    .where(and(gte(orders.scheduledFor, new Date()), ne(orders.status, 'cancelled')))
  const [{ birthdays }] = await db
    .select({ birthdays: sql<number>`count(*)::int` })
    .from(occasions)
    .where(sql`(make_date(extract(year from now())::int, ${occasions.month}, ${occasions.day}) between current_date and current_date + 30)
               or (make_date(extract(year from now())::int + 1, ${occasions.month}, ${occasions.day}) between current_date and current_date + 30)`)

  /* Customers: repeat and gift share in the period. */
  const repeatRows = await db.execute<{ repeats: number; total: number }>(sql`
    select count(*) filter (where n > 1)::int as repeats, count(*)::int as total
    from (select customer_id, count(*) as n from bakery.orders where status <> 'cancelled' group by 1) c
  `)
  const giftShare = live.length ? live.filter((o) => o.hidePrice || o.fulfillment === 'delivery').length / live.length : 0
  const leadDays = live.length
    ? live.reduce((s, o) => s + (o.scheduledFor.getTime() - o.createdAt.getTime()) / 86_400_000, 0) / live.length
    : 0

  const [marks, competitors] = await Promise.all([
    db.select().from(benchmarks).orderBy(asc(benchmarks.metric)),
    db.select().from(competitorPrices).orderBy(asc(competitorPrices.category), desc(competitorPrices.checkedOn)),
  ])

  const ourPrices = await db
    .select({ id: products.id, name: products.name, category: products.category, priceVnd: products.basePriceVnd })
    .from(products)
    .where(eq(products.isActive, true))

  return {
    period,
    now,
    before,
    channels,
    trend: trend.map((t) => ({ week: t.week, revenueVnd: t.revenue, orders: t.orders })),
    menu,
    heat,
    ahead: { booked, bookedRevenueVnd: bookedRevenue, birthdays },
    customers: {
      repeatPct: repeatRows[0]?.total ? repeatRows[0].repeats / repeatRows[0].total : 0,
      repeats: repeatRows[0]?.repeats ?? 0,
      total: repeatRows[0]?.total ?? 0,
      giftShare,
      leadDays,
    },
    benchmarks: marks,
    competitors,
    ourPrices,
    settings,
    feeVnd,
  }
}
