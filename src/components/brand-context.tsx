'use client'

import { createContext, useContext } from 'react'
import type { PublicBrand } from '@/lib/brand'

const BrandContext = createContext<PublicBrand | null>(null)

/** Set once in the root layout; client components read the shop name and links from here. */
export function BrandProvider({ brand, children }: { brand: PublicBrand; children: React.ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export function useBrand(): PublicBrand {
  const brand = useContext(BrandContext)
  if (!brand) throw new Error('useBrand outside BrandProvider')
  return brand
}
