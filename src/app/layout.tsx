import type { Metadata, Viewport } from 'next'
import { Nunito, Quicksand } from 'next/font/google'
import { BrandProvider } from '@/components/brand-context'
import { RememberChannel } from '@/components/remember-channel'
import { paletteStyle } from '@/lib/brand'
import { getBrand, logoUrl, publicBrand } from '@/server/brand/service'
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

/** Name and colours come from the owner's brand settings (/quan-ly/thuong-hieu). */
export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand()
  const logo = logoUrl(brand.logoPath)
  return {
    title: { default: brand.name, template: `%s · ${brand.name}` },
    description: brand.tagline,
    formatDetection: { telephone: false, date: false, address: false, email: false },
    ...(logo ? { icons: { icon: logo } } : {}),
  }
}

export async function generateViewport(): Promise<Viewport> {
  const brand = await getBrand()
  return { viewportFit: 'cover', themeColor: brand.palette.background }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const brand = await getBrand()
  return (
    <html lang="vi" className={`${nunito.variable} ${quicksand.variable} h-full antialiased`} style={paletteStyle(brand.palette)}>
      <body className="min-h-full font-sans">
        <BrandProvider brand={publicBrand(brand)}>
          {children}
          <RememberChannel />
        </BrandProvider>
      </body>
    </html>
  )
}
