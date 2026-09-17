/**
 * Calendar maths in Vietnam time (UTC+7, no daylight saving), whatever the
 * server's or the phone's time zone is.
 */

const TZ = 'Asia/Ho_Chi_Minh'
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const WEEKDAY_LONG = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']

/** "2026-09-20" for the Vietnam date of `at`. */
export function vnDate(at: Date = new Date()): string {
  return at.toLocaleDateString('en-CA', { timeZone: TZ })
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The instant `hour`:00 Vietnam time on `date`. */
export function vnInstant(date: string, hour: number): Date {
  return new Date(`${date}T${String(hour).padStart(2, '0')}:00:00+07:00`)
}

/** Vietnam hour (0–23) of an instant. */
export function vnHour(at: Date): number {
  return Number(at.toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }))
}

function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

function dayMonth(date: string) {
  return `${Number(date.slice(8, 10))}/${Number(date.slice(5, 7))}`
}

/** "T7 20" */
export function shortDay(date: string): string {
  return `${WEEKDAY_SHORT[weekday(date)]} ${Number(date.slice(8, 10))}`
}

/** "Thứ bảy, 20/9" */
export function longDay(date: string): string {
  return `${WEEKDAY_LONG[weekday(date)]}, ${dayMonth(date)}`
}

/** "thứ bảy 20/9" for inside a sentence. */
export function inlineDay(date: string): string {
  return `${WEEKDAY_LONG[weekday(date)].toLowerCase()} ${dayMonth(date)}`
}

/** "T4 17/9 · 21:04" */
export function stamp(at: Date): string {
  const date = vnDate(at)
  const time = at.toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  return `${WEEKDAY_SHORT[weekday(date)]} ${dayMonth(date)} · ${time.replace(/^0/, '')}`
}

export { dayMonth }
