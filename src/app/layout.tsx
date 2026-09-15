import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'

const beVietnam = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

// Placeholder until the shop has a name.
export const metadata: Metadata = {
  title: 'Tiệm bánh',
  description: 'Bánh làm tay, đặt trước, giao tận nơi.',
  formatDetection: { telephone: false, date: false, address: false, email: false },
}

export const viewport: Viewport = {
  viewportFit: 'cover',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  )
}
