/**
 * Prices from the cookbook's receipts.
 *
 * The owner photographs a receipt in the cookbook and ticks "giá cho tiệm
 * bánh" on the lines bought for the shop. Once the receipt is applied, those
 * lines show up here to be recorded as ingredient prices. Each line id is kept
 * on the price row (`source_ref`, unique), so importing twice does nothing.
 *
 * Only the owner's own cookbook account counts: the cookbook users table is
 * shared with other people's accounts, so receipts are filtered by the
 * OWNER_EMAILS allowlist.
 *
 * Read-only on the cookbook schema. No `next/*` imports.
 */

import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import { db } from '../db'
import { cbReceiptLines, cbReceipts, cbUsers } from '../db/cookbook'
import { ingredientPrices, ingredients } from '../db/schema'
import { CostingError, recordPrice } from './ingredients'
import { matchKey } from './service'
import { ownerEmails } from '../owner'

/** Receipt units → the bakery's three price units, with the factor to get there. */
const UNIT: Record<string, { unit: 'g' | 'ml' | 'cai'; factor: number }> = {
  g: { unit: 'g', factor: 1 },
  kg: { unit: 'g', factor: 1000 },
  lạng: { unit: 'g', factor: 100 },
  mg: { unit: 'g', factor: 0.001 },
  ml: { unit: 'ml', factor: 1 },
  l: { unit: 'ml', factor: 1000 },
}

export function toBakeryUnit(quantity: number | null, unit: string | null) {
  if (quantity == null || quantity <= 0) return null
  const known = unit ? UNIT[unit.toLowerCase()] : undefined
  return known ? { unit: known.unit, packQuantity: quantity * known.factor } : { unit: 'cai' as const, packQuantity: quantity }
}


export type PendingLine = {
  lineId: string
  name: string
  quantity: number | null
  unit: string | null
  priceVnd: number | null
  store: string | null
  boughtOn: string
  /** The bakery ingredient this will price, if one already has the same name. */
  matchId: string | null
  matchName: string | null
  /** Why it cannot be imported as is. */
  problem: string | null
}

export async function pendingReceiptLines(): Promise<PendingLine[]> {
  const emails = ownerEmails()
  if (emails.length === 0) return []

  const rows = await db
    .select({
      lineId: cbReceiptLines.id,
      name: cbReceiptLines.name,
      quantity: cbReceiptLines.quantity,
      unit: cbReceiptLines.unit,
      priceVnd: cbReceiptLines.priceVnd,
      store: cbReceipts.storeName,
      boughtOn: cbReceipts.boughtOn,
    })
    .from(cbReceiptLines)
    .innerJoin(cbReceipts, eq(cbReceipts.id, cbReceiptLines.receiptId))
    .innerJoin(cbUsers, eq(cbUsers.id, cbReceipts.userId))
    .where(
      and(
        eq(cbReceiptLines.forBakery, true),
        isNotNull(cbReceipts.appliedAt),
        inArray(sql`lower(${cbUsers.email})`, emails),
        sql`not exists (select 1 from bakery.ingredient_prices p where p.source_ref = ${cbReceiptLines.id}::text)`,
      ),
    )
    .orderBy(desc(cbReceipts.boughtOn), asc(cbReceiptLines.position))
    .limit(100)

  const known = await db.select({ id: ingredients.id, name: ingredients.name, matchKey: ingredients.matchKey, unit: ingredients.unit }).from(ingredients)
  return rows.map((r) => {
    const key = matchKey(r.name)
    const match = known.find((k) => k.matchKey === key)
    const pack = toBakeryUnit(r.quantity, r.unit)
    const UNIT_LABEL: Record<string, string> = { g: 'gram', ml: 'ml', cai: 'cái' }
    // A price per box must never land on an ingredient costed per gram.
    const problem =
      r.priceVnd == null
        ? 'thiếu giá'
        : pack == null
          ? 'thiếu số lượng'
          : match && match.unit !== pack.unit
            ? `bảng giá tính theo ${UNIT_LABEL[match.unit] ?? match.unit}, hóa đơn ghi ${r.unit ?? 'cái'} — sửa lượng trong cookbook`
            : null
    return {
      ...r,
      priceVnd: r.priceVnd != null ? Math.round(r.priceVnd) : null,
      boughtOn: String(r.boughtOn).slice(0, 10),
      matchId: match?.id ?? null,
      matchName: match?.name ?? null,
      problem,
    }
  })
}

/** Record the chosen lines as prices. Returns how many were new. */
export async function importReceiptLines(lineIds: string[]) {
  const pending = await pendingReceiptLines()
  let imported = 0
  const skipped: string[] = []
  for (const line of pending.filter((p) => lineIds.includes(p.lineId))) {
    const pack = toBakeryUnit(line.quantity, line.unit)
    if (line.problem || !pack || line.priceVnd == null || line.priceVnd <= 0) {
      skipped.push(line.name)
      continue
    }
    let result: { inserted: boolean }
    try {
      result = await recordPrice({
      ingredientId: line.matchId ?? undefined,
      name: line.matchId ? undefined : line.name,
      unit: pack.unit,
      packQuantity: pack.packQuantity,
      packLabel: `${line.quantity}${line.unit ? ` ${line.unit}` : ''}`,
      priceVnd: line.priceVnd,
      supplier: line.store ?? undefined,
      boughtOn: line.boughtOn,
      source: 'receipt',
      sourceRef: line.lineId,
      })
    } catch (error) {
      // A unit clash with an ingredient created earlier in this same import.
      if (error instanceof CostingError) {
        skipped.push(`${line.name} (${error.message})`)
        continue
      }
      throw error
    }
    if (result.inserted) imported++
  }
  return { imported, skipped }
}

/** How many prices came from receipts, for the ingredients page footer. */
export async function receiptPriceCount() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(ingredientPrices).where(isNotNull(ingredientPrices.sourceRef))
  return n
}
