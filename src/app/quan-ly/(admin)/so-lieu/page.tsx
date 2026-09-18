import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Card, SectionTitle } from '@/components/ui'
import { formatK, formatVnd } from '@/lib/money'
import { ORDERS_PER_SLOT } from '@/lib/shop'
import { dashboard } from '@/server/admin/analytics'

export const metadata: Metadata = { title: 'Số liệu · Vibe Bánh', robots: { index: false } }

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const CHANNEL_LABEL: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  direct: 'Tự vào thẳng',
  other: 'Khác',
}

export default async function DashboardPage({ searchParams }: PageProps<'/quan-ly/so-lieu'>) {
  await connection()
  const { ky } = await searchParams
  const days = ky === '30' ? 30 : ky === '90' ? 90 : 7
  const d = await dashboard(days)
  const { now, before } = d

  const delta = (a: number, b: number) => (b > 0 ? `${a >= b ? '▲' : '▼'} ${Math.abs(Math.round(((a - b) / b) * 100))}%` : 'kỳ trước chưa có đơn')
  const maxRevenue = Math.max(1, ...d.trend.map((t) => t.revenueVnd))

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <SectionTitle>Số liệu</SectionTitle>
        <nav className="flex gap-2 text-sm">
          {[
            ['7', '7 ngày'],
            ['30', '30 ngày'],
            ['90', '90 ngày'],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={`/quan-ly/so-lieu?ky=${value}`}
              className={`rounded-full px-3 py-2 ${String(days) === value ? 'bg-foreground font-bold text-white' : 'bg-surface shadow-[var(--shadow-soft)]'}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {now.orders === 0 ? (
        <Card className="mt-3 text-sm text-muted">Kỳ này chưa có đơn nào. Số liệu sẽ hiện khi khách bắt đầu đặt.</Card>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Kpi label="Doanh thu" value={formatK(now.revenueVnd)} hint={delta(now.revenueVnd, before.revenueVnd)} />
            <Kpi label="Số đơn" value={String(now.orders)} hint={`kỳ trước ${before.orders}`} />
            <Kpi label="Trung bình / đơn" value={formatK(now.aovVnd)} hint={delta(now.aovVnd, before.aovVnd)} />
            <Kpi
              label="Lãi thật"
              value={now.profitVnd != null ? formatK(now.profitVnd) : '—'}
              hint={now.marginPct != null ? `${Math.round(now.marginPct * 100)}% doanh thu` : 'chưa đủ giá vốn'}
            />
            <Kpi label="Công suất" value={`${Math.round(now.capacityPct * 100)}%`} hint="chỗ đã dùng" />
            <Kpi label="Giỏ bỏ dở" value={String(now.abandoned)} hint="đơn tạo mà không cọc" />
          </div>

          {now.costedShare < 0.999 && (
            <p className="mt-3 rounded-2xl bg-lemon px-4 py-3 text-sm text-[#5C4A12]">
              Chỉ <b>{Math.round(now.costedShare * 100)}%</b> doanh thu có giá vốn đầy đủ, nên lãi ở trên chỉ tính trên phần đó. Khai thành phần và
              nhập giá cho các món còn lại để con số đủ tin.
            </p>
          )}
        </>
      )}

      {/* Revenue trend */}
      {d.trend.length > 0 && (
        <Card className="mt-3">
          <b>Doanh thu 8 tuần</b>
          <div className="mt-3 flex h-40 items-end gap-2">
            {d.trend.map((t) => (
              <div key={t.week} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[11px] text-muted tabular-nums">{formatK(t.revenueVnd)}</span>
                <div
                  className="w-full min-h-1 rounded-t-lg bg-pink"
                  style={{ height: `${Math.max(4, (t.revenueVnd / maxRevenue) * 100)}%` }}
                  title={`${t.orders} đơn`}
                />
                <span className="text-[11px] text-muted">{t.week.slice(8, 10)}/{t.week.slice(5, 7)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Channels — revenue and profit per source */}
      <Card className="mt-3">
        <b>Lợi nhuận theo kênh</b>
        {d.channels.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Chưa có đơn nào trong kỳ.</p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-dashed divide-line text-sm">
            {d.channels.map((c) => (
              <li key={c.channel} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2">
                <span>
                  <b>{CHANNEL_LABEL[c.channel] ?? c.channel}</b>
                  <span className="block text-xs text-muted">{c.orders} đơn</span>
                </span>
                <span className="text-right tabular-nums">{formatK(c.revenueVnd)}</span>
                <span className={`min-w-20 text-right font-bold tabular-nums ${c.marginPct != null && c.marginPct >= d.settings.targetMarginPct ? 'text-mint-ink' : 'text-berry'}`}>
                  {c.profitVnd != null ? `${formatK(c.profitVnd)} · ${Math.round((c.marginPct ?? 0) * 100)}%` : 'chưa đủ giá vốn'}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">Kênh lấy từ link khách bấm vào (utm_source hoặc nơi dẫn sang). Khách gõ thẳng địa chỉ tính là &quot;tự vào thẳng&quot;.</p>
      </Card>

      {/* Menu matrix */}
      <Card className="mt-3">
        <b>Ma trận menu · 4 tuần</b>
        {d.menu.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Chưa bán được món nào.</p>
        ) : (
          <ul className="mt-2 flex flex-col divide-y divide-dashed divide-line text-sm">
            {d.menu.map((m) => {
              const median = d.menu.map((x) => x.sold).sort((a, b) => a - b)[Math.floor(d.menu.length / 2)] ?? 0
              const popular = m.sold >= median
              const rich = (m.marginPct ?? 0) >= d.settings.targetMarginPct
              const verdict =
                m.marginPct == null
                  ? 'chưa tính được lãi'
                  : popular && rich
                    ? 'ngôi sao — giữ và đẩy'
                    : popular && !rich
                      ? 'bán chạy, lãi thấp — tăng giá'
                      : !popular && rich
                        ? 'lãi cao, bán chậm — quảng bá'
                        : 'cân nhắc bỏ'
              return (
                <li key={m.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
                  <span>
                    <b>{m.name}</b>
                    <span className="block text-xs text-muted">
                      {m.sold} cái · {formatK(m.revenueVnd)} · {verdict}
                    </span>
                  </span>
                  <span className={`font-bold tabular-nums ${rich ? 'text-mint-ink' : 'text-berry'}`}>
                    {m.marginPct != null ? `${Math.round(m.marginPct * 100)}%` : '—'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Slot heatmap */}
      <Card className="mt-3">
        <b>Khung giờ kín tới đâu · 4 tuần</b>
        <div className="mt-2 grid grid-cols-[62px_repeat(7,minmax(0,1fr))] gap-1 text-xs">
          <span />
          {DAY_LABELS.map((l) => (
            <span key={l} className="text-center text-muted">
              {l}
            </span>
          ))}
          {d.heat.map((row) => (
            <Fragmentish key={row.slot} label={row.slot} values={row.days} />
          ))}
        </div>
      </Card>

      {/* Known demand */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Kpi label="Đơn đã đặt trước" value={String(d.ahead.booked)} hint={formatK(d.ahead.bookedRevenueVnd)} />
        <Kpi label="Sinh nhật 30 ngày tới" value={String(d.ahead.birthdays)} hint="khách đồng ý nhắc" />
        <Kpi label="Khách quay lại" value={`${Math.round(d.customers.repeatPct * 100)}%`} hint={`${d.customers.repeats}/${d.customers.total} khách`} />
      </div>

      {/* Benchmarks */}
      <Card className="mt-3">
        <b>So với tiệm khác</b>
        {d.benchmarks.length === 0 && d.competitors.length === 0 ? (
          <p className="mt-1 text-sm text-muted">
            Chưa có mốc nào. Nhập ở <Link href="/quan-ly/cai-dat" className="font-bold text-berry">Cài đặt</Link> — số của tiệm khác không tự lấy được.
          </p>
        ) : (
          <>
            <ul className="mt-2 flex flex-col divide-y divide-dashed divide-line text-sm">
              {d.benchmarks.map((b) => {
                const ours =
                  b.metric === 'margin_pct' ? (now.marginPct != null ? now.marginPct * 100 : null)
                  : b.metric === 'aov_vnd' ? now.aovVnd
                  : b.metric === 'orders_per_week' ? (now.orders / days) * 7
                  : null
                const inside = ours != null && b.lowValue != null && b.highValue != null && ours >= b.lowValue && ours <= b.highValue
                return (
                  <li key={b.metric} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2">
                    <span>
                      <b>{b.label}</b>
                      <span className="block text-xs text-muted">
                        mốc {b.lowValue} – {b.highValue}
                        {b.source && ` · ${b.source}`}
                      </span>
                    </span>
                    <span className={`text-right font-bold tabular-nums ${ours == null ? 'text-muted' : inside ? 'text-mint-ink' : 'text-berry'}`}>
                      {ours == null ? 'chưa tính được' : b.metric === 'aov_vnd' ? formatVnd(Math.round(ours)) : Math.round(ours)}
                    </span>
                  </li>
                )
              })}
            </ul>
            {d.competitors.length > 0 && (
              <div className="mt-3">
                <b className="text-sm">Giá cùng loại</b>
                <ul className="mt-1 flex flex-col divide-y divide-dashed divide-line text-sm">
                  {d.competitors.slice(0, 8).map((c) => {
                    const ours = d.ourPrices.filter((p) => p.category === c.category)
                    const min = ours.length ? Math.min(...ours.map((p) => p.priceVnd)) : null
                    return (
                      <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2">
                        <span>
                          <b>{c.shopName}</b> · {c.productLabel}
                          {c.sizeLabel && ` (${c.sizeLabel})`}
                          <span className="block text-xs text-muted">
                            {min != null ? `mình từ ${formatVnd(min)}` : 'mình chưa có món cùng loại'} · xem {c.checkedOn}
                          </span>
                        </span>
                        <b className="whitespace-nowrap">{formatVnd(c.priceVnd)}</b>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="py-3.5">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted">{hint}</div>
    </Card>
  )
}

/** One heat row: the slot label and seven day cells. */
function Fragmentish({ label, values }: { label: string; values: number[] }) {
  return (
    <>
      <span className="self-center text-muted">{label}</span>
      {values.map((n, i) => {
        const share = Math.min(1, n / (ORDERS_PER_SLOT * 4))
        const bg = share === 0 ? 'var(--color-line)' : share >= 0.9 ? 'var(--color-berry)' : share >= 0.6 ? '#D97BA0' : share >= 0.3 ? 'var(--color-pink)' : 'var(--color-blush)'
        return (
          <span
            key={i}
            className={`flex h-8 items-center justify-center rounded-lg text-[11px] font-bold ${share >= 0.6 ? 'text-white' : ''}`}
            style={{ background: bg }}
            title={`${n} đơn trong 4 tuần`}
          >
            {n || ''}
          </span>
        )
      })}
    </>
  )
}
