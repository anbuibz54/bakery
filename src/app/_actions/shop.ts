'use server'

import { redirect } from 'next/navigation'
import { log } from '@/server/logger'
import { CheckoutError, placeOrder } from '@/server/checkout/service'
import { OccasionError, saveOccasion } from '@/server/occasions/service'

export type OccasionState = { ok: true; message: string } | { ok: false; message: string } | null

export async function saveOccasionAction(_prev: OccasionState, form: FormData): Promise<OccasionState> {
  try {
    const saved = await saveOccasion({
      personName: form.get('personName'),
      date: form.get('date'),
      phone: form.get('phone'),
      consent: form.get('consent') === 'on',
    })
    return { ok: true, message: `Đã lưu ngày ${saved.day}/${saved.month} của ${saved.personName}. Trước 7 ngày tiệm nhắn tin nhắc bạn.` }
  } catch (error) {
    if (error instanceof OccasionError) return { ok: false, message: error.message }
    log.error('save occasion failed', { error })
    return { ok: false, message: 'Tiệm chưa lưu được, bạn thử lại sau chút nhé.' }
  }
}

export type CheckoutState = { error: string; field?: string } | null

/** The checkout form posts its whole state as JSON in one field. */
export async function placeOrderAction(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  let token: string
  try {
    const order = await placeOrder(JSON.parse(String(form.get('payload') ?? '{}')))
    token = order.trackToken
  } catch (error) {
    if (error instanceof CheckoutError) return { error: error.message, field: error.field }
    log.error('place order failed', { error })
    return { error: 'Tiệm chưa nhận được đơn do lỗi hệ thống. Bạn thử lại, hoặc nhắn tiệm qua Instagram / Facebook nhé.' }
  }
  redirect(`/don/${token}/thanh-toan?moi=1`)
}
