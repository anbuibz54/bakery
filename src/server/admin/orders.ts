/**
 * The owner's side of an order: the day's list, moving an order along, and the
 * shopping list for a bake day.
 *
 * Every status change writes an `order_events` row in the same transaction —
 * the customer's tracking page is that table, so a status that moves without a
 * line of story is a bug.
 *
 * No `next/*` imports.
 */

import { and, asc, eq, gte, lt, ne, sql } from 'drizzle-orm'
import { db } from '../db'
import { customers, orderEvents, orderItems, orders, productComponents, products } from '../db/schema'
import { cbRecipeIngredients } from '../db/cookbook'
import { vnDate, vnInstant } from '../../lib/dates'
import { matchKey, pricedIngredients } from '../costing/service'

export type OrderStatus = (typeof orders.status.enumValues)[number]

/** The order of the story. `delivering` is skipped for pickup. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  pending: 'confirmed',
  confirmed: 'baking',
  baking: 'decorating',
  decorating: 'ready',
  ready: 'delivering',
  delivering: 'completed',
  completed: null,
  cancelled: null,
}

export const STATUS_MESSAGE: Record<OrderStatus, string> = {
  pending: 'Tiệm đã nhận đơn của bạn.',
  confirmed: 'Lịch nướng đã giữ cho bạn.',
  baking: 'Cốt bánh đã vào lò.',
  decorating: 'Đang đánh kem và trang trí.',
  ready: 'Bánh xong rồi, đang chờ tới giờ.',
  delivering: 'Bánh đang trên đường tới bạn.',
  completed: 'Bánh đã tới nơi. Chúc cả nhà ngon miệng!',
  cancelled: 'Đơn đã huỷ.',
}

export async function ordersOnDay(date: string) {
  const rows = await db
    .select({
      id: orders.id,
      code: orders.code,
      trackToken: orders.trackToken,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      fulfillment: orders.fulfillment,
      scheduledFor: orders.scheduledFor,
      deliveryAddress: orders.deliveryAddress,
      recipientName: orders.recipientName,
      totalVnd: orders.totalVnd,
      paidVnd: orders.paidVnd,
      customerName: customers.name,
      customerPhone: customers.phone,
      customerNote: orders.customerNote,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(and(gte(orders.scheduledFor, vnInstant(date, 0)), lt(orders.scheduledFor, vnInstant(date, 24)), ne(orders.status, 'cancelled')))
    .orderBy(asc(orders.scheduledFor))

  const items = rows.length
    ? await db
        .select({ orderId: orderItems.orderId, productName: orderItems.productName, options: orderItems.options, cakeMessage: orderItems.cakeMessage, quantity: orderItems.quantity })
        .from(orderItems)
        .where(sql`${orderItems.orderId} in ${sql.raw(`(${rows.map((r) => `'${r.id}'`).join(',')})`)}`)
    : []

  return rows.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }))
}

/** Days that have orders, from today onwards — the tabs on the bake-day screen. */
export async function upcomingBakeDays(days = 10) {
  const today = vnDate()
  const rows = await db
    .select({ scheduledFor: orders.scheduledFor, n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(gte(orders.scheduledFor, vnInstant(today, 0)), ne(orders.status, 'cancelled')))
    .groupBy(orders.scheduledFor)
  const byDay = new Map<string, number>()
  for (const r of rows) {
    const d = vnDate(r.scheduledFor)
    byDay.set(d, (byDay.get(d) ?? 0) + r.n)
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, days)
    .map(([date, count]) => ({ date, count }))
}

export async function advanceStatus(orderId: string, status: OrderStatus, message?: string) {
  await db.transaction(async (trx) => {
    await trx.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, orderId))
    await trx.insert(orderEvents).values({ orderId, status, message: message?.trim() || STATUS_MESSAGE[status] })
  })
}

export async function addNote(orderId: string, message: string, visibleToCustomer = true) {
  await db.insert(orderEvents).values({ orderId, message: message.trim(), visibleToCustomer })
}

/* -------------------------------------------------------------------------- */
/* What to buy for a bake day                                                  */
/* -------------------------------------------------------------------------- */

export type ShoppingLine = {
  ingredientId: string | null
  name: string
  quantity: number
  unit: string
  costVnd: number | null
  supplier: string
}

/**
 * Everything the day's orders need, added up per ingredient and grouped by the
 * supplier of its latest price. Nothing is subtracted: the shop does not track
 * stock (owner's decision), so this is "what these cakes need", not "what is
 * missing".
 */
export async function bakeDayShopping(date: string): Promise<{ groups: { supplier: string; lines: ShoppingLine[]; costVnd: number }[]; missing: string[] }> {
  const dayOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(gte(orders.scheduledFor, vnInstant(date, 0)), lt(orders.scheduledFor, vnInstant(date, 24)), ne(orders.status, 'cancelled')))
  if (dayOrders.length === 0) return { groups: [], missing: [] }

  const items = await db
    .select({ productId: orderItems.productId, options: orderItems.options, quantity: orderItems.quantity })
    .from(orderItems)
    .where(sql`${orderItems.orderId} in ${sql.raw(`(${dayOrders.map((o) => `'${o.id}'`).join(',')})`)}`)

  const productIds = [...new Set(items.map((i) => i.productId).filter((id): id is string => Boolean(id)))]
  if (productIds.length === 0) return { groups: [], missing: [] }

  const [pool, components, productRows] = await Promise.all([
    pricedIngredients(),
    db.select().from(productComponents).where(sql`${productComponents.productId} in ${sql.raw(`(${productIds.map((p) => `'${p}'`).join(',')})`)}`),
    db.select({ id: products.id, name: products.name }).from(products).where(sql`${products.id} in ${sql.raw(`(${productIds.map((p) => `'${p}'`).join(',')})`)}`),
  ])

  const recipeIds = [...new Set(components.map((c) => c.recipeId).filter((id): id is string => Boolean(id)))]
  const recipeLines = recipeIds.length
    ? await db.select().from(cbRecipeIngredients).where(sql`${cbRecipeIngredients.recipeId} in ${sql.raw(`(${recipeIds.map((r) => `'${r}'`).join(',')})`)}`)
    : []

  const totals = new Map<string, ShoppingLine>()
  const missing: string[] = []
  const add = (key: string, line: ShoppingLine) => {
    const seen = totals.get(key)
    if (seen) {
      seen.quantity += line.quantity
      if (seen.costVnd != null && line.costVnd != null) seen.costVnd += line.costVnd
    } else totals.set(key, { ...line })
  }

  for (const item of items) {
    const chosen = ((item.options as { optionId?: string }[]) ?? []).map((o) => o.optionId).filter(Boolean) as string[]
    for (const c of components.filter((c) => c.productId === item.productId)) {
      // Option-specific components only count when that option was chosen. The
      // snapshot keeps labels, not ids, so an option-bound component is counted
      // for every unit — flagged rather than silently wrong.
      if (c.optionId && chosen.length > 0 && !chosen.includes(c.optionId)) continue
      if (c.recipeId) {
        for (const l of recipeLines.filter((l) => l.recipeId === c.recipeId)) {
          const quantity = (l.grams ?? l.quantity ?? 0) * c.multiplier * item.quantity
          const match = pool.find((i) => (l.foodId && i.foodId === l.foodId) || i.matchKey === matchKey(l.name))
          if (!match) {
            missing.push(l.name)
            add(`?${matchKey(l.name)}`, { ingredientId: null, name: l.name, quantity, unit: l.grams != null ? 'g' : (l.unit ?? ''), costVnd: null, supplier: 'Chưa có trong bảng giá' })
          } else {
            add(match.id, { ingredientId: match.id, name: match.name, quantity, unit: match.unit, costVnd: match.unitCostVnd != null ? match.unitCostVnd * quantity : null, supplier: 'Chưa rõ nơi mua' })
          }
        }
      } else if (c.ingredientId) {
        const match = pool.find((i) => i.id === c.ingredientId)
        const quantity = (c.quantity ?? 0) * item.quantity
        if (match) add(match.id, { ingredientId: match.id, name: match.name, quantity, unit: match.unit, costVnd: match.unitCostVnd != null ? match.unitCostVnd * quantity : null, supplier: 'Chưa rõ nơi mua' })
      }
    }
  }

  const productsWithoutComponents = productRows.filter((p) => !components.some((c) => c.productId === p.id))
  missing.push(...productsWithoutComponents.map((p) => `${p.name} (chưa khai thành phần)`))

  // Supplier of the latest price, for grouping the trip.
  const supplierRows = await db.execute<{ ingredient_id: string; supplier: string | null }>(sql`
    select distinct on (p.ingredient_id) p.ingredient_id, s.name as supplier
    from bakery.ingredient_prices p
    left join bakery.suppliers s on s.id = p.supplier_id
    order by p.ingredient_id, p.bought_on desc, p.created_at desc
  `)
  const supplierById = new Map(supplierRows.map((r) => [r.ingredient_id, r.supplier]))

  const groups = new Map<string, ShoppingLine[]>()
  for (const line of totals.values()) {
    const supplier = (line.ingredientId && supplierById.get(line.ingredientId)) || line.supplier
    line.supplier = supplier
    groups.set(supplier, [...(groups.get(supplier) ?? []), line])
  }

  return {
    groups: [...groups.entries()].map(([supplier, lines]) => ({
      supplier,
      lines: lines.sort((a, b) => a.name.localeCompare(b.name)),
      costVnd: lines.reduce((s, l) => s + (l.costVnd ?? 0), 0),
    })),
    missing: [...new Set(missing)],
  }
}
