import type { Metadata } from 'next'
import { connection } from 'next/server'
import { SectionTitle } from '@/components/ui'
import { listCategories } from '@/server/catalog/categories'
import { searchRecipes } from '@/server/costing/ingredients'
import { NewProduct } from './new-product'

export const metadata: Metadata = { title: 'Thêm bánh', robots: { index: false } }

export default async function NewProductPage() {
  await connection()
  const [categories, recipes] = await Promise.all([listCategories(true), searchRecipes('')])
  return (
    <>
      <SectionTitle>Thêm bánh</SectionTitle>
      <NewProduct categories={categories} recipes={recipes.map((r) => ({ id: r.id, title: r.title, yieldLabel: r.yieldLabel, servings: r.servings }))} />
    </>
  )
}
