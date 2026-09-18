import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Card, SectionTitle } from '@/components/ui'
import { vnDate } from '@/lib/dates'
import { formatVnd } from '@/lib/money'
import { listIngredients, listSuppliers } from '@/server/costing/ingredients'
import { PriceForm } from './price-form'

export const metadata: Metadata = { title: 'Nguyên liệu · Vibe Bánh', robots: { index: false } }

const unitLabel: Record<string, string> = { g: 'kg', ml: 'lít', cai: 'cái' }

export default async function IngredientsPage() {
  await connection()
  const [rows, suppliers] = await Promise.all([listIngredients(), listSuppliers()])
  const unpriced = rows.filter((r) => r.unitCostVnd == null)

  return (
    <>
      <SectionTitle>Nguyên liệu & giá</SectionTitle>
      <p className="mt-1 text-sm text-muted">
        {rows.length} nguyên liệu · {suppliers.length} nơi mua. Giá cũ được giữ lại để xem xu hướng.
      </p>

      <PriceForm ingredients={rows.map((r) => ({ id: r.id, name: r.name, unit: r.unit }))} suppliers={suppliers.map((s) => s.name)} today={vnDate()} />

      {unpriced.length > 0 && (
        <p className="mt-3 rounded-2xl bg-lemon px-4 py-3 text-sm text-[#5C4A12]">
          <b>Chưa có giá:</b> {unpriced.map((r) => r.name).join(', ')}.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {rows.length === 0 && <Card className="text-sm text-muted">Chưa có nguyên liệu nào. Nhập giá lần mua gần nhất ở trên là xong.</Card>}
        {rows.map((r) => {
          const per = r.unitCostVnd == null ? null : r.unit === 'cai' ? r.unitCostVnd : r.unitCostVnd * 1000
          return (
            <Card key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
              <div className="min-w-0">
                <div className="font-bold">
                  {r.name}
                  {r.isPackaging && <span className="ml-2 rounded-full bg-lilac px-2 py-0.5 text-xs font-bold">bao bì</span>}
                </div>
                <div className="text-[13px] text-muted">
                  {r.latest
                    ? `${r.latest.packLabel ?? `${r.latest.packQuantity}${r.unit}`} · ${formatVnd(r.latest.priceVnd)} · ${r.latest.supplier ?? 'chưa ghi nơi mua'} · ${r.latest.boughtOn}`
                    : 'chưa có giá nào'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold tabular-nums">{per != null ? `${formatVnd(per)}/${unitLabel[r.unit] ?? r.unit}` : '—'}</div>
                {r.trend != null && Math.abs(r.trend) >= 0.02 && (
                  <div className={`text-xs font-bold ${r.trend > 0 ? 'text-berry' : 'text-mint-ink'}`}>
                    {r.trend > 0 ? '▲' : '▼'} {Math.abs(Math.round(r.trend * 100))}% so với lần trước
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
