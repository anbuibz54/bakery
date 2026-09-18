import type { Metadata, Viewport } from 'next'
import { Nunito, Quicksand } from 'next/font/google'
import { RememberChannel } from '@/components/remember-channel'
import './globals.css'

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '600', '700'],
  display: 'swap',
})

const quicksand = Quicksand({
  variable: '--font-quicksand',
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Vibe Bánh',
  description: 'Bánh làm tay, đặt trước, giao tận nơi.',
  formatDetection: { telephone: false, date: false, address: false, email: false },
}

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#fff8fb',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="vi" className={`${nunito.variable} ${quicksand.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {children}
        <RememberChannel />
      </body>
    </html>
  )
}
