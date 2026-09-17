/**
 * "Đừng để lỡ ngày quan trọng": dates a customer asked to be reminded of.
 * Only ever written with explicit consent (Law 91/2025) — `consentAt` is the
 * moment they ticked the box.
 *
 * No `next/*` imports.
 */

import { z } from 'zod'
import { db } from '../db'
import { customers, occasions } from '../db/schema'
import { normalizePhone } from '../orders/service'

export class OccasionError extends Error {}

const input = z.object({
  personName: z.string().trim().min(1).max(80),
  /** "12/10" or "12-10" — day first, the Vietnamese way. */
  date: z.string().trim(),
  phone: z.string().trim(),
  consent: z.literal(true),
})

export async function saveOccasion(raw: unknown) {
  const parsed = input.safeParse(raw)
  if (!parsed.success) {
    const consentMissing = parsed.error.issues.some((i) => i.path[0] === 'consent')
    throw new OccasionError(consentMissing ? 'Bạn tick đồng ý để tiệm được lưu và nhắn nhắc nhé.' : 'Điền đủ tên, ngày và số điện thoại giúp tiệm.')
  }
  const { personName, date, phone: rawPhone } = parsed.data

  const m = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})$/.exec(date)
  const day = m ? Number(m[1]) : 0
  const month = m ? Number(m[2]) : 0
  const valid = month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(2024, month, 0)).getUTCDate()
  if (!valid) throw new OccasionError('Ngày viết kiểu 12/10 (ngày/tháng) nhé.')

  const phone = normalizePhone(rawPhone)
  if (!phone) throw new OccasionError('Số điện thoại chưa đúng — 10 số, bắt đầu bằng 0.')

  await db.transaction(async (trx) => {
    const [customer] = await trx
      .insert(customers)
      .values({ phone })
      .onConflictDoUpdate({ target: customers.phone, set: { phone } })
      .returning({ id: customers.id })
    await trx.insert(occasions).values({ customerId: customer.id, label: 'Sinh nhật', personName, month, day, consentAt: new Date() })
  })
  return { personName, day, month }
}
