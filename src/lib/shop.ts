/**
 * Shop settings that change rarely. Values marked PLACEHOLDER are guesses the
 * owner still has to confirm (see CLAUDE.md "Open questions").
 */

export const SHOP_NAME = 'Vibe Bánh'

/** PLACEHOLDER: pickup point from the mockup. */
export const PICKUP_ADDRESS = 'Nguyễn Thị Thập, Q.7'

/**
 * PLACEHOLDER: flat delivery fees by area, until there is a distance API.
 * The checkout says the fee is an estimate and the shop confirms by message.
 */
export const DELIVERY_ZONES = [
  { id: 'gan', label: 'Q.7, Q.4, Nhà Bè', feeVnd: 25_000 },
  { id: 'vua', label: 'Q.1, Q.8, Thủ Thiêm, Bình Chánh', feeVnd: 35_000 },
  { id: 'xa', label: 'Quận khác trong TP.HCM', feeVnd: 50_000 },
] as const
export type DeliveryZoneId = (typeof DELIVERY_ZONES)[number]['id']

/**
 * Where customers talk to the shop. No Zalo on purpose — the shop lives on
 * Instagram, Facebook and TikTok. An entry with an empty url is hidden.
 *
 * Link straight into a chat where the platform allows it:
 * Instagram DM `https://ig.me/m/<username>`, Messenger `https://m.me/<page>`.
 */
export const SOCIALS: readonly { id: 'instagram' | 'facebook' | 'tiktok'; label: string; action: string; url: string }[] = [
  { id: 'instagram', label: 'Instagram', action: 'nhắn DM', url: 'https://ig.me/m/alordoflove' },
  { id: 'facebook', label: 'Facebook', action: 'Messenger', url: 'https://m.me/khanh.an.bui.oan' },
  { id: 'tiktok', label: 'TikTok', action: 'xem bánh mới', url: '' }, // TODO: when the shop account opens
]
export type SocialId = (typeof SOCIALS)[number]['id']

/** Receiving windows, Vietnam time. `scheduled_for` stores the start. */
export const SLOTS = [
  { id: '9', label: '9–11h', startHour: 9, endHour: 11 },
  { id: '14', label: '14–16h', startHour: 14, endHour: 16 },
  { id: '17', label: '17–19h', startHour: 17, endHour: 19 },
] as const
export type SlotId = (typeof SLOTS)[number]['id']

/** One oven, one person. PLACEHOLDER numbers. */
export const ORDERS_PER_DAY = 8
export const ORDERS_PER_SLOT = 3

/** How far ahead the checkout offers dates. */
export const BOOKING_DAYS = 14

export function slotLabelForHour(hour: number): string {
  return SLOTS.find((s) => s.startHour === hour)?.label ?? `${hour}h`
}
