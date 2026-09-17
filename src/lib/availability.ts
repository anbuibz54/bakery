/**
 * Booking calendar shapes and the pure rules on them, shared by the server
 * (validation) and the browser (drawing date and slot chips).
 */

import type { SlotId } from './shop'

export type SlotAvailability = {
  id: SlotId
  label: string
  /** ISO instant of the slot start. */
  startsAt: string
  left: number
}

export type DayAvailability = {
  date: string
  short: string
  long: string
  left: number
  slots: SlotAvailability[]
}

export type DayState = { kind: 'open'; left: number } | { kind: 'too-soon' } | { kind: 'full' }

/**
 * Pure: what a day looks like for an order needing `leadHours` notice.
 * Used on the server to validate and in the browser to draw the chips.
 */
export function dayState(day: DayAvailability, leadHours: number, now = Date.now()): DayState {
  const reachable = day.slots.filter((s) => new Date(s.startsAt).getTime() >= now + leadHours * 3_600_000)
  if (reachable.length === 0) return { kind: 'too-soon' }
  const open = reachable.filter((s) => s.left > 0)
  if (day.left <= 0 || open.length === 0) return { kind: 'full' }
  return { kind: 'open', left: Math.min(day.left, open.reduce((n, s) => n + s.left, 0)) }
}

export function slotOpen(slot: SlotAvailability, day: DayAvailability, leadHours: number, now = Date.now()) {
  return day.left > 0 && slot.left > 0 && new Date(slot.startsAt).getTime() >= now + leadHours * 3_600_000
}
