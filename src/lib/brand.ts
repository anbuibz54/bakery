/**
 * The shop's identity: defaults, colour presets, and the maths that keeps an
 * owner-picked palette readable. Pure — used by the server (layout, admin
 * validation) and the browser (live preview).
 */

export const DEFAULT_NAME = 'Vibe Baking'
export const DEFAULT_WORDMARK = 'vibe baking'
export const DEFAULT_TAGLINE = 'Bánh làm tại nhà theo đơn. Đặt trước, chọn ngày giờ nhận.'

/** Every colour token the site uses. Keys match the CSS variables in globals.css. */
export const BRAND_TOKENS = [
  { key: 'background', label: 'Nền trang', group: 'main' },
  { key: 'foreground', label: 'Chữ chính', group: 'main' },
  { key: 'berry', label: 'Màu nhấn (nút, giá)', group: 'main' },
  { key: 'pink', label: 'Khối lớn (hero, đầu trang đơn)', group: 'main' },
  { key: 'surface', label: 'Thẻ', group: 'more' },
  { key: 'muted', label: 'Chữ phụ', group: 'more' },
  { key: 'blush', label: 'Nền nhạt của màu nhấn', group: 'more' },
  { key: 'sky', label: 'Khối xanh (nhắc sinh nhật)', group: 'more' },
  { key: 'lemon', label: 'Khối vàng (lưu ý, thiệp)', group: 'more' },
  { key: 'lilac', label: 'Khối tím nhạt', group: 'more' },
  { key: 'line', label: 'Đường kẻ', group: 'more' },
  { key: 'mint', label: 'Nền báo thành công', group: 'more' },
  { key: 'mint-ink', label: 'Chữ báo thành công', group: 'more' },
] as const

export type TokenKey = (typeof BRAND_TOKENS)[number]['key']
export type Palette = Record<TokenKey, string>

export const PRESETS: { id: string; name: string; palette: Palette }[] = [
  {
    id: 'hop-qua-pastel',
    name: 'Hộp quà pastel',
    palette: {
      background: '#fff8fb', surface: '#ffffff', foreground: '#3a2e39', muted: '#857684', berry: '#b23a6b',
      pink: '#f6c1d4', blush: '#fde3ec', sky: '#cfe8f3', lemon: '#fff0b3', lilac: '#e4daf5',
      line: '#f1dde6', mint: '#d5efe3', 'mint-ink': '#2f7a5b',
    },
  },
  {
    id: 'bo-sua',
    name: 'Bơ sữa',
    palette: {
      background: '#fffaf0', surface: '#ffffff', foreground: '#3b2f23', muted: '#86775f', berry: '#9a5b12',
      pink: '#f7dfa6', blush: '#fbeecd', sky: '#dcebf2', lemon: '#fff3c4', lilac: '#ece3f5',
      line: '#f0e3c8', mint: '#dcefdc', 'mint-ink': '#3c6e3a',
    },
  },
  {
    id: 'bac-ha',
    name: 'Bạc hà',
    palette: {
      background: '#f6fbf8', surface: '#ffffff', foreground: '#23352d', muted: '#6c8278', berry: '#1f7a5a',
      pink: '#bfe6d3', blush: '#dff2e8', sky: '#d4e9f5', lemon: '#fbf1bf', lilac: '#e3e0f4',
      line: '#d9ece2', mint: '#d5efe3', 'mint-ink': '#1f6b4c',
    },
  },
  {
    id: 'socola',
    name: 'Socola',
    palette: {
      background: '#fbf6f2', surface: '#ffffff', foreground: '#33241d', muted: '#806a5e', berry: '#7a3b24',
      pink: '#e8cdbd', blush: '#f4e4da', sky: '#d9e6ee', lemon: '#f7eac4', lilac: '#e7dcef',
      line: '#ecdcd1', mint: '#dcecdf', 'mint-ink': '#3d6a45',
    },
  },
]

export const DEFAULT_PALETTE: Palette = PRESETS[0].palette

const HEX = /^#[0-9a-f]{6}$/i

/** Fill gaps and drop junk: whatever is stored, the site always gets a full palette. */
export function completePalette(raw: unknown): Palette {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out = { ...DEFAULT_PALETTE }
  for (const { key } of BRAND_TOKENS) {
    const v = source[key]
    if (typeof v === 'string' && HEX.test(v)) out[key] = v.toLowerCase()
  }
  return out
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * The pairs that must stay readable, with the WCAG AA threshold for normal
 * text. The admin shows these live and refuses to save a palette that fails
 * the first two — an unreadable button loses orders.
 */
export function readabilityChecks(p: Palette) {
  return [
    { label: 'Chữ trắng trên nút', ratio: contrast('#ffffff', p.berry), min: 4.5, blocking: true },
    { label: 'Chữ chính trên nền', ratio: contrast(p.foreground, p.background), min: 4.5, blocking: true },
    { label: 'Chữ chính trên khối lớn', ratio: contrast(p.foreground, p.pink), min: 4.5, blocking: false },
    { label: 'Chữ phụ trên nền', ratio: contrast(p.muted, p.background), min: 3, blocking: false },
  ]
}

/** CSS custom properties for <html style>. */
export function paletteStyle(p: Palette): Record<string, string> {
  return Object.fromEntries(BRAND_TOKENS.map(({ key }) => [`--${key}`, p[key]]))
}

export type PublicBrand = {
  name: string
  wordmark: string
  tagline: string
  logoUrl: string | null
  socials: { id: 'instagram' | 'facebook' | 'tiktok'; label: string; action: string; url: string }[]
}
