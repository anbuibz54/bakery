import type { Metadata } from 'next'
import { connection } from 'next/server'
import { desc } from 'drizzle-orm'
import { Card, SectionTitle } from '@/components/ui'
import { vnDate } from '@/lib/dates'
import { formatVnd } from '@/lib/money'
import { db } from '@/server/db'
import { benchmarks, competitorPrices } from '@/server/db/schema'
import { getSettings } from '@/server/costing/service'
import { BenchmarkForms } from './benchmark-forms'
import { SettingsForm } from './settings-form'

export const metadata: Metadata = { title: 'Cài đặt', robots: { index: false } }

export default async function SettingsPage() {
  await connection()
  const [settings, marks, competitors] = await Promise.all([
    getSettings(),
    db.select().from(benchmarks),
    db.select().from(competitorPrices).orderBy(desc(competitorPrices.checkedOn)).limit(30),
  ])

  return (
    <>
      <SectionTitle>Cách tính giá vốn</SectionTitle>
      <SettingsForm settings={settings} />

      <SectionTitle className="mt-6 text-xl">So với tiệm khác</SectionTitle>
      <p className="mt-1 text-sm text-muted">
        Tiệm khác không có API, nên số ở đây là bạn (hoặc Claude, kèm nguồn) tự nhập. Dashboard chỉ so với những gì có trong hai bảng này.
      </p>
      <BenchmarkForms
        today={vnDate()}
        marks={marks.map((m) => ({ metric: m.metric, label: m.label, lowValue: m.lowValue, highValue: m.highValue, source: m.source }))}
      />

      <Card className="mt-3">
        <b>Giá tiệm khác đã ghi</b>
        {competitors.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Chưa có dòng nào.</p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-dashed divide-line text-sm">
            {competitors.map((c) => (
              <li key={c.id} className="flex justify-between gap-3 py-2">
                <span>
                  <b>{c.shopName}</b> · {c.productLabel}
                  {c.sizeLabel && ` (${c.sizeLabel})`}
                  <span className="block text-xs text-muted">
                    {c.category} · xem ngày {c.checkedOn}
                  </span>
                </span>
                <b className="whitespace-nowrap">{formatVnd(c.priceVnd)}</b>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
