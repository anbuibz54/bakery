import type { Metadata } from 'next'
import { connection } from 'next/server'
import { SectionTitle } from '@/components/ui'
import { getBrand, logoUrl } from '@/server/brand/service'
import { BrandForm } from './brand-form'

export const metadata: Metadata = { title: 'Thương hiệu', robots: { index: false } }

export default async function BrandPage() {
  await connection()
  const brand = await getBrand()
  return (
    <>
      <SectionTitle>Thương hiệu</SectionTitle>
      <p className="mt-1 text-sm text-muted">Tên, logo, màu và link mạng xã hội của tiệm. Lưu xong là cửa hàng đổi theo, không cần làm lại web.</p>
      <BrandForm
        brand={{
          name: brand.name,
          wordmark: brand.wordmark,
          tagline: brand.tagline,
          palette: brand.palette,
          logoUrl: logoUrl(brand.logoPath),
          instagramUrl: brand.instagramUrl ?? '',
          facebookUrl: brand.facebookUrl ?? '',
          tiktokUrl: brand.tiktokUrl ?? '',
        }}
      />
    </>
  )
}
