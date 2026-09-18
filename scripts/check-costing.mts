/**
 * Unit rules for costing and receipt import. No database.   pnpm check:costing
 */
import { lineQuantity } from '../src/server/costing/service.ts'
import { toBakeryUnit } from '../src/server/costing/receipts.ts'

let failed = 0
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`)
}

// Eggs are bought per piece: count them, never use the grams estimate.
eq('eggs priced per piece use the count', lineQuantity({ quantity: 5, unit: 'quả', grams: 250 }, 'cai'), 5)
eq('a bare number counts as pieces', lineQuantity({ quantity: 2, unit: null, grams: 100 }, 'cai'), 2)
eq('grams cannot price a per-piece item', lineQuantity({ quantity: 250, unit: 'g', grams: 250 }, 'cai'), null)
// Flour is bought per gram.
eq('grams win for weighed items', lineQuantity({ quantity: 1.5, unit: 'chén', grams: 180 }, 'g'), 180)
eq('kg converts when grams are missing', lineQuantity({ quantity: 0.5, unit: 'kg', grams: null }, 'g'), 500)
eq('a count without grams cannot be weighed', lineQuantity({ quantity: 2, unit: 'quả', grams: null }, 'g'), null)
// Cream is bought per ml.
eq('litres convert to ml', lineQuantity({ quantity: 0.25, unit: 'l', grams: 250 }, 'ml'), 250)
eq('ml falls back to grams', lineQuantity({ quantity: 2, unit: 'tbsp', grams: 30 }, 'ml'), 30)

eq('receipt kg → g', toBakeryUnit(1, 'kg'), { unit: 'g', packQuantity: 1000 })
eq('receipt l → ml', toBakeryUnit(2, 'l'), { unit: 'ml', packQuantity: 2000 })
eq('receipt hộp → pieces', toBakeryUnit(10, 'hộp'), { unit: 'cai', packQuantity: 10 })
eq('receipt without quantity', toBakeryUnit(null, 'kg'), null)

if (failed) {
  console.log(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nall passed')
