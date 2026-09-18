/**
 * Turning a cart into an order.
 *
 * The browser sends only what the customer chose (product, option ids,
 * quantity, message). Every price, the deposit, the lead time and the slot
 * capacity are worked out again here — a cart in localStorage is a wish, not a
 * price list.
 *
 * No `next/*` imports.
 */

import { z } from 'zod'
import { productsForPricing } from '../catalog/service'
import { costProduct, getSettings, pricedIngredients } from '../costing/service'
import { createOrder, normalizePhone } from '../orders/service'
import { bookingCalendar } from '../schedule/service'
import { slotOpen } from '../../lib/availability'
import { DELIVERY_ZONES, SLOTS } from '../../lib/shop'
import { vnInstant } from '../../lib/dates'

export const checkoutInput = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        optionIds: z.array(z.string().uuid()).max(10),
        cakeMessage: z.string().trim().max(60).optional(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(20),
  fulfillment: z.enum(['pickup', 'delivery']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotId: z.string(),
  zoneId: z.string().optional(),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim(),
  name: z.string().trim().max(80).optional(),
  gift: z.boolean(),
  recipientName: z.string().trim().max(80).optional(),
  recipientPhone: z.string().trim().optional(),
  giftNote: z.string().trim().max(300).optional(),
  hidePrice: z.boolean(),
  saveOccasion: z.boolean(),
  note: z.string().trim().max(500).optional(),
  channel: z.enum(['instagram', 'facebook', 'tiktok', 'direct', 'other']).default('direct'),
})
export type CheckoutInput = z.infer<typeof checkoutInput>

/** A problem the customer can fix, with the form field it belongs to. */
export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message)
  }
}

export async function placeOrder(raw: unknown) {
  const parsed = checkoutInput.safeParse(raw)
  if (!parsed.success) throw new CheckoutError('Thông tin đơn chưa đủ, bạn kiểm tra lại giúp tiệm nhé.')
  const input = parsed.data

  const phone = normalizePhone(input.phone)
  if (!phone) throw new CheckoutError('Số điện thoại chưa đúng — 10 số, bắt đầu bằng 0.', 'phone')

  // Price every line from the database.
  const catalog = await productsForPricing([...new Set(input.lines.map((l) => l.productId))])
  const items = input.lines.map((line) => {
    const product = catalog.find((p) => p.id === line.productId)
    if (!product) throw new CheckoutError('Có bánh trong giỏ không còn bán nữa. Bạn xoá nó đi rồi đặt lại nhé.')
    if (product.soldOutNote) throw new CheckoutError(`${product.name} đang tạm hết: ${product.soldOutNote}.`)

    const groups = [...new Set(product.options.map((o) => o.group))]
    const chosen = groups.map((g) => {
      const pick = product.options.filter((o) => o.group === g && line.optionIds.includes(o.id))
      if (pick.length !== 1) throw new CheckoutError(`Chọn lại ${g === 'size' ? 'size' : g.toLowerCase()} cho ${product.name} giúp tiệm nhé.`)
      return pick[0]
    })

    return {
      productId: product.id,
      productName: product.name,
      options: chosen.map((o) => ({ optionId: o.id, group: o.group, label: o.detail ? `${o.label} · ${o.detail}` : o.label, priceDeltaVnd: o.priceDeltaVnd })),
      cakeMessage: product.takesDeposit ? line.cakeMessage || undefined : undefined,
      quantity: line.quantity,
      unitPriceVnd: product.basePriceVnd + chosen.reduce((s, o) => s + o.priceDeltaVnd, 0),
      takesDeposit: product.takesDeposit,
      leadTimeHours: product.leadTimeHours,
    }
  })

  // The slot must still be open for the slowest item.
  const slot = SLOTS.find((s) => s.id === input.slotId)
  const day = (await bookingCalendar()).find((d) => d.date === input.date)
  const daySlot = day?.slots.find((s) => s.id === input.slotId)
  const lead = Math.max(...items.map((i) => i.leadTimeHours))
  if (!slot || !day || !daySlot || !slotOpen(daySlot, day, lead)) {
    throw new CheckoutError('Khung giờ này vừa kín hoặc không kịp làm. Bạn chọn giờ khác nhé.', 'slot')
  }

  let deliveryFeeVnd = 0
  if (input.fulfillment === 'delivery') {
    const zone = DELIVERY_ZONES.find((z) => z.id === input.zoneId)
    if (!zone) throw new CheckoutError('Chọn khu vực giao để tiệm tính phí nhé.', 'zone')
    if (!input.address) throw new CheckoutError('Tiệm cần địa chỉ giao bánh.', 'address')
    deliveryFeeVnd = zone.feeVnd
  }

  if (input.gift && !input.recipientName) throw new CheckoutError('Người nhận tên gì?', 'recipientName')
  if (input.gift && input.recipientPhone && !normalizePhone(input.recipientPhone)) {
    throw new CheckoutError('Số điện thoại người nhận chưa đúng.', 'recipientPhone')
  }

  // Cost every line now, so this order's margin never moves when prices do.
  // A costing failure must not block a sale: the line is stored uncosted.
  const [pool, settings] = await Promise.all([pricedIngredients(), getSettings()])
  const costed = await Promise.all(
    items.map(async (i) => {
      try {
        const cost = await costProduct(i.productId, input.lines.find((l) => l.productId === i.productId)?.optionIds ?? [], pool, settings)
        return { ...i, unitCostVnd: cost && cost.missing.length === 0 ? cost.unitCostVnd : null }
      } catch {
        return { ...i, unitCostVnd: null }
      }
    }),
  )

  const hasCake = items.some((i) => i.takesDeposit)
  const occasion =
    input.saveOccasion && hasCake
      ? {
          label: 'Sinh nhật',
          personName: input.gift ? input.recipientName : undefined,
          month: Number(input.date.slice(5, 7)),
          day: Number(input.date.slice(8, 10)),
        }
      : undefined

  return createOrder({
    phone,
    name: input.name,
    fulfillment: input.fulfillment,
    scheduledFor: vnInstant(input.date, slot.startHour),
    deliveryAddress: input.fulfillment === 'delivery' ? input.address : undefined,
    deliveryFeeVnd,
    items: costed.map((i) => ({ ...i, leadTimeHours: undefined })),
    recipientName: input.gift ? input.recipientName : undefined,
    recipientPhone: input.gift ? input.recipientPhone || undefined : undefined,
    giftNote: input.gift ? input.giftNote || undefined : undefined,
    hidePrice: input.gift && input.hidePrice,
    customerNote: input.note || undefined,
    channel: input.channel,
    occasion,
  })
}
