import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Card, SectionTitle } from '@/components/ui'
import { formatVnd } from '@/lib/money'
import { listMenu } from '@/server/catalog/service'
import { costProduct, defaultOptionIds, getSettings, pricedIngredients } from '@/server/costing/service'

export const metadata: Metadata = { title: 'Giá vốn · Vibe Bánh', robots: { index: false } }

export default async function CostListPage() {
  await connection()
  const [menu, pool, settings] = await Promise.all([listMenu(), pricedIngredients(), getSettings()])

  const rows = await Promise.all(
    menu.map(async (p) => {
      const options = await defaultOptionIds(p.id)
      const cost = await costProduct(p.id, options, pool, settings)
      const priceVnd = p.basePriceVnd + 0
      const complete = cost && cost.missing.length === 0 && cost.unitCostVnd > 0
      return {
        ...p,
        priceVnd,
        unitCostVnd: complete ? cost!.unitCostVnd : null,
        marginPct: complete ? (priceVnd - cost!.unitCostVnd) / priceVnd : null,
        ingredientPct: complete ? cost!.ingredientsVnd / priceVnd : null,
        missing: cost?.missing ?? [],
      }
    }),
  )

  return (
    <>
      <SectionTitle>Giá vốn từng món</SectionTitle>
      <p className="mt-1 text-sm text-muted">
        Tính theo size mặc định. Mục tiêu của bạn: nguyên liệu tối đa {Math.round(settings.targetIngredientPct * 100)}%, lãi thật{' '}
        {Math.round(settings.targetMarginPct * 100)}%.
      </p>

      <div className="mt-3 flex flex-col gap-3">
        {rows.map((r) => (
          <Link key={r.id} href={`/quan-ly/gia-von/${r.slug}`} className="block">
            <Card className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="font-bold">{r.name}</div>
                <div className="text-[13px] text-muted">
                  Giá bán {formatVnd(r.priceVnd)}
                  {r.unitCostVnd != null && ` · vốn ${formatVnd(r.unitCostVnd)}`}
                </div>
                {r.missing.length > 0 && <div className="mt-1 text-[13px] font-bold text-berry">Thiếu giá: {r.missing.slice(0, 3).join(', ')}</div>}
              </div>
              <div className="text-right">
                {r.marginPct != null ? (
                  <>
                    <div className={`font-display text-xl font-bold ${r.marginPct >= settings.targetMarginPct ? 'text-mint-ink' : 'text-berry'}`}>
                      {Math.round(r.marginPct * 100)}%
                    </div>
                    <div className="text-xs text-muted">nguyên liệu {Math.round((r.ingredientPct ?? 0) * 100)}%</div>
                  </>
                ) : (
                  <span className="text-[13px] text-muted">chưa tính được</span>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
