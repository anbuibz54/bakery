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
  letter: {
    fill: 'M6 11h21v15H6z',
    line: 'M5 9.5h21.5v15.5H5z M5.5 10.5l10.4 8.6 10.2-8.6 M22 4.8c.9-1.9 3.9-1.8 3.9.9 0 2.1-3.9 4.2-3.9 4.2s-3.9-2.1-3.9-4.2c0-2.7 3-2.8 3.9-.9z',
  },
  croissant: {
    fill: 'M6 21c2-7 8-11 11-11s9 4 11 11c-3 1-5 0-6-2-2 3-8 3-10 0-1 2-3 3-6 2z',
    line: 'M5 20c2-7 8-11.2 11-11.2S25 13 27 20c-3 1.1-5 .1-6-1.9-2 3.1-8 3.1-10 0-1 2-3 3-6 1.9z M12.2 11.8l2 6.6 M19.8 11.8l-2 6.6',
  },
  lantern: {
    fill: 'M11 12h12c2 3 2 9 0 12H11c-2-3-2-9 0-12z',
    line: 'M10 11h12c2.1 3 2.1 9 0 12H10c-2.1-3-2.1-9 0-12z M12 7.8h8v3.2h-8z M16 3.8v4 M16 23v5.2 M14 11c-1.1 3-1.1 9 0 12 M18 11c1.1 3 1.1 9 0 12',
  },
  house: {
    fill: 'M7 16l10-8 10 8v11H7z',
    line: 'M6 15l10-8.2 10 8.2v11H6z M13 26v-6.2h6V26',
  },
  scooter: {
    fill: 'M12 13h9l2 6H12z',
    line: 'M5.5 21.5a3 3 0 1 0 6 0 3 3 0 1 0-6 0 M20.5 21.5a3 3 0 1 0 6 0 3 3 0 1 0-6 0 M11.5 21.5h9 M11 12.5h9.5l2.5 9 M20.5 12.5l1-4.5h3 M7 18.5l2-6h5',
  },
  bowl: {
    fill: 'M6 17h22c0 6-5 9-11 9S6 23 6 17z',
    line: 'M5 16h22c0 6.2-5 9.2-11 9.2S5 22.2 5 16z M19 16l5.5-10.5 M21.5 16l4-7.5',
  },
  camera: {
    fill: 'M6 13h22v13H6z',
    line: 'M5 12h5.5l2-3h7l2 3H27v13H5z M12 18.5a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
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

export type StampName = keyof typeof PATHS

export function StampIcon({
  name,
  size = 32,
  print = PRINT.pink,
  className,
}: {
  name: StampName
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
