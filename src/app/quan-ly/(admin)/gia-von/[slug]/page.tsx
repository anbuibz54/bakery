import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Card, SectionTitle } from '@/components/ui'
import { formatVnd } from '@/lib/money'
import { getProduct } from '@/server/catalog/service'
import { ingredientOptions, listComponents, packagingOptions, searchRecipes } from '@/server/costing/ingredients'
import { costProduct, feePerOrderVnd, getSettings, suggestedPriceVnd } from '@/server/costing/service'
import { ComponentEditor } from './component-editor'
import { PriceBox } from './price-box'

export const metadata: Metadata = { title: 'Giá vốn món', robots: { index: false } }

export default async function ProductCostPage({ params, searchParams }: PageProps<'/quan-ly/gia-von/[slug]'>) {
  await connection()
  const [{ slug }, query] = await Promise.all([params, searchParams])
  const product = await getProduct(slug)
  if (!product) notFound()

  // Which option of each group we are costing; first of each group by default.
  const chosen = product.groups.map((g) => {
    const picked = typeof query[`g_${g.name}`] === 'string' ? String(query[`g_${g.name}`]) : null
    return g.options.find((o) => o.id === picked) ?? g.options[0]
  })
  const optionIds = chosen.map((o) => o.id)
  const priceVnd = product.basePriceVnd + chosen.reduce((s, o) => s + o.priceDeltaVnd, 0)

  const settings = await getSettings()
  const [cost, components, recipes, ingredients, packaging, feeVnd] = await Promise.all([
    costProduct(product.id, optionIds, undefined, settings),
    listComponents(product.id),
    searchRecipes(''),
    ingredientOptions(),
    packagingOptions(),
    feePerOrderVnd(settings),
  ])
  if (!cost) notFound()

  const complete = cost.missing.length === 0
  const profit = priceVnd - cost.unitCostVnd
  const suggested = suggestedPriceVnd(cost.unitCostVnd, settings.targetMarginPct)

  return (
    <>
      <SectionTitle>{product.name}</SectionTitle>

      {product.groups.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {product.groups.map((g) => (
            <div key={g.name} className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-bold text-muted">{g.name}:</span>
              {g.options.map((o) => {
                const on = optionIds.includes(o.id)
                const next = new URLSearchParams(Object.entries(query).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])))
                next.set(`g_${g.name}`, o.id)
                return (
                  <a
                    key={o.id}
                    href={`?${next}`}
                    className={`flex h-9 items-center rounded-full px-3 text-sm ${on ? 'bg-foreground font-bold text-white' : 'bg-surface shadow-[var(--shadow-soft)]'}`}
                  >
                    {o.label}
                    {o.detail && ` · ${o.detail}`}
                  </a>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-3xl bg-pink px-5 py-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-berry">Giá bán</div>
            <div className="font-display text-xl font-bold">{formatVnd(priceVnd)}</div>
          </div>
          <div>
            <div className="text-xs text-berry">Giá vốn</div>
            <div className="font-display text-xl font-bold">{complete ? formatVnd(cost.unitCostVnd) : '—'}</div>
          </div>
          <div>
            <div className="text-xs text-berry">Lãi thật</div>
            <div className="font-display text-xl font-bold">{complete ? formatVnd(profit) : '—'}</div>
          </div>
        </div>
        {complete && (
          <>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/60">
              <span style={{ width: `${Math.min(100, (cost.ingredientsVnd / priceVnd) * 100)}%` }} className="bg-berry" />
              <span style={{ width: `${Math.min(100, ((cost.unitCostVnd - cost.ingredientsVnd) / priceVnd) * 100)}%` }} className="bg-berry/60" />
            </div>
            <div className="mt-1.5 flex justify-between text-xs text-foreground/80">
              <span>nguyên liệu {Math.round((cost.ingredientsVnd / priceVnd) * 100)}%</span>
              <span>chi phí khác {Math.round(((cost.unitCostVnd - cost.ingredientsVnd) / priceVnd) * 100)}%</span>
              <span className="font-bold">lãi {Math.round((profit / priceVnd) * 100)}%</span>
            </div>
          </>
        )}
      </div>

      {cost.missing.length > 0 && (
        <p className="mt-3 rounded-2xl bg-lemon px-4 py-3 text-sm text-foreground/85">
          <b>Chưa đủ dữ liệu:</b> {cost.missing.join(', ')}. Thêm giá ở trang Nguyên liệu, hoặc khai thành phần bên dưới.
        </p>
      )}
      {complete && cost.ingredientsVnd / priceVnd > settings.targetIngredientPct && (
        <p className="mt-3 rounded-2xl bg-lemon px-4 py-3 text-sm text-foreground/85">
          Nguyên liệu chiếm <b>{Math.round((cost.ingredientsVnd / priceVnd) * 100)}%</b> giá bán, cao hơn mức{' '}
          {Math.round(settings.targetIngredientPct * 100)}% bạn đặt. Để lãi {Math.round(settings.targetMarginPct * 100)}% cần bán{' '}
          <b>{formatVnd(suggested)}</b>.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-3">
        {cost.groups.map((g, i) => (
          <Card key={i} className="py-3.5">
            <div className="flex items-baseline justify-between">
              <b>{g.label}</b>
              <b>{formatVnd(g.costVnd)}</b>
            </div>
            <div className="mb-1 text-xs text-muted">{g.source}</div>
            <ul className="flex flex-col divide-y divide-dashed divide-line text-sm">
              {g.lines.map((l, n) => (
                <li key={n} className="flex justify-between gap-3 py-1.5">
                  <span>
                    {l.name}
                    <span className="text-muted">
                      {' '}
                      · {Math.round(l.quantity ?? 0).toLocaleString('vi-VN')}
                      {l.unit && ` ${l.unit}`}
                    </span>
                  </span>
                  <span className={l.costVnd == null ? 'font-bold text-berry' : ''}>
                    {l.costVnd == null ? (l.missing === 'price' ? 'chưa có giá' : 'chưa có trong bảng') : formatVnd(l.costVnd)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="mt-3 py-3.5">
        <b>Chi phí khác</b>
        <ul className="mt-1 flex flex-col divide-y divide-dashed divide-line text-sm">
          <li className="flex justify-between py-1.5">
            <span>
              Bao bì <span className="text-muted">· khai ở thành phần</span>
            </span>
            <span>{formatVnd(cost.packagingVnd)}</span>
          </li>
          <li className="flex justify-between py-1.5">
            <span>
              Gas / điện <span className="text-muted">· lò {settings.ovenKw}kW × {product.ovenMinutes} phút</span>
            </span>
            <span>{formatVnd(cost.energyVnd)}</span>
          </li>
          <li className="flex justify-between py-1.5">
            <span>
              Công làm <span className="text-muted">· {product.labourMinutes} phút × {formatVnd(settings.labourPerHourVnd)}/giờ</span>
            </span>
            <span>{formatVnd(cost.labourVnd)}</span>
          </li>
          <li className="flex justify-between py-1.5 text-muted">
            <span>Phí thanh toán (tính theo đơn, không nằm trong giá vốn món)</span>
            <span>{formatVnd(feeVnd)}</span>
          </li>
        </ul>
      </Card>

      <PriceBox
        productId={product.id}
        priceVnd={priceVnd}
        basePriceVnd={product.basePriceVnd}
        optionDeltaVnd={priceVnd - product.basePriceVnd}
        unitCostVnd={complete ? cost.unitCostVnd : null}
        suggestedVnd={complete ? suggested : null}
        labourMinutes={product.labourMinutes}
        ovenMinutes={product.ovenMinutes}
      />

      <ComponentEditor
        productId={product.id}
        components={components.map((c) => ({
          id: c.id,
          label: c.label ?? c.recipeTitle ?? c.ingredientName ?? 'Thành phần',
          detail: c.recipeId
            ? `công thức${c.multiplier === 1 ? '' : ` × ${c.multiplier}`}`
            : `${c.quantity ?? 0}${c.ingredientUnit ?? ''}`,
          optionId: c.optionId,
        }))}
        options={product.groups.flatMap((g) => g.options.map((o) => ({ id: o.id, label: `${g.name}: ${o.label}` })))}
        recipes={recipes}
        ingredients={[...ingredients, ...packaging.map((p) => ({ ...p, isPackaging: true }))]}
      />
    </>
  )
}
