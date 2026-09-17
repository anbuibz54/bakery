/**
 * The shop's hand-drawn icon set, "tem in lệch": an ink line with a pastel
 * print offset behind it, like a stamp on a cake box. Drawn on a 32 grid.
 * Same paths as the mockup (design/mockups/CIcons.dc.html). No emoji.
 */

const PATHS = {
  cake: {
    fill: 'M7 17h19v10H7z',
    line: 'M6 16c2 2.2 3.2 2.2 5 0s3.3-2.2 5 0 3.2 2.2 5 0 3.3-2.1 5 0v10.5H6z M16 9.5v5.5 M16 4.5c1.5 1.4 1.5 2.9 0 4.2-1.5-1.3-1.5-2.8 0-4.2z M9 21.5h14',
  },
  gift: {
    fill: 'M7 15h20v12H7z',
    line: 'M6 14h20v12.5H6z M5 10h22v4H5z M16 10v16.5 M16 10c-2.2-4.2-7.2-4-6-1.1C10.8 10.8 16 10 16 10z M16 10c2.2-4.2 7.2-4 6-1.1-.8 1.9-6 1.1-6 1.1z',
  },
  oven: {
    fill: 'M7 9h20v18H7z',
    line: 'M6 8h20v18H6z M6 13h20 M10 17h12v6H10z M10 10.5h.1 M13.5 10.5h.1',
  },
  calendar: {
    fill: 'M7 10h20v17H7z',
    line: 'M6 9h20v17H6z M6 14h20 M11 6v5 M21 6v5 M18.5 19h3v3h-3z',
  },
  phone: {
    fill: 'M11 5h12v23H11z',
    line: 'M10 4h12v23.5H10z M14.5 24h3',
  },
  check: {
    fill: 'M6 17a10 10 0 1 0 20 0 10 10 0 1 0-20 0',
    line: 'M5 16a11 11 0 1 0 22 0 11 11 0 1 0-22 0 M11 16.5l3.4 3.5 6.6-7.5',
  },
} as const

/** Print colours: stronger than the UI pastels so the offset reads. */
export const PRINT = {
  pink: '#F2A3BD',
  sky: '#94CBE3',
  lemon: '#F5D163',
  lilac: '#C4AEEA',
  mint: '#9AD6BA',
  peach: '#F6B48A',
} as const

export function StampIcon({
  name,
  size = 32,
  print = PRINT.pink,
  className,
}: {
  name: keyof typeof PATHS
  size?: number
  print?: string
  className?: string
}) {
  const p = PATHS[name]
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path d={p.fill} fill={print} transform="translate(2.6 2.4)" />
      <path d={p.line} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
