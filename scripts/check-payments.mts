/**
 * Payment rules and SePay parsing. No database.   pnpm check:payments
 */
import { depositFor, derivePaymentStatus, dueNowVnd } from '../src/server/payments/status.ts'
import { orderCodeFrom, parseBankTime, parseWebhook, signWebhook, verifyWebhook } from '../src/server/payments/sepay.ts'

let failed = 0
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`)
}

// The mockup's order: 420k cake (deposit) + 140k pastry + 35k delivery.
const lines = [
  { lineTotalVnd: 420_000, takesDeposit: true },
  { lineTotalVnd: 140_000, takesDeposit: false },
]
eq('deposit = 50% cake + pastry + delivery', depositFor(lines, 35_000), 385_000)
eq('50% rounds up to a thousand', depositFor([{ lineTotalVnd: 325_000, takesDeposit: true }], 0), 163_000)
eq('ready-made only: deposit is the total', depositFor([{ lineTotalVnd: 140_000, takesDeposit: false }], 0), 140_000)

const t = (paidVnd: number) => ({ paidVnd, depositVnd: 385_000, totalVnd: 595_000 })
eq('nothing paid', derivePaymentStatus(t(0)), 'unpaid')
eq('short of deposit', derivePaymentStatus(t(300_000)), 'underpaid')
eq('exact deposit', derivePaymentStatus(t(385_000)), 'deposit_paid')
eq('between deposit and total', derivePaymentStatus(t(500_000)), 'deposit_paid')
eq('full', derivePaymentStatus(t(595_000)), 'paid')
eq('overpaid is paid', derivePaymentStatus(t(700_000)), 'paid')
eq('refunded stays refunded', derivePaymentStatus(t(595_000), 'refunded'), 'refunded')
eq('due: whole deposit', dueNowVnd(t(0)), 385_000)
eq('due: rest of deposit', dueNowVnd(t(300_000)), 85_000)
eq('due: rest of total after deposit', dueNowVnd(t(385_000)), 210_000)
eq('due: nothing when paid', dueNowVnd(t(595_000)), 0)
eq('due without deposit rule', dueNowVnd({ paidVnd: 0, depositVnd: 0, totalVnd: 90_000 }), 90_000)

eq('code from SePay field', orderCodeFrom('VB123456', 'whatever'), 'VB123456')
eq('code from memo, lower case', orderCodeFrom(null, 'vb123456 chuyen tien'), 'VB123456')
eq('code inside bank prefix', orderCodeFrom(null, 'MBVCB.3278.VB042017.CT tu 0071'), 'VB042017')
eq('code with a space', orderCodeFrom(null, 'NGUYEN VAN A VB 123456'), 'VB123456')
eq('seven digits is not a code', orderCodeFrom(null, 'VB1234567'), null)
eq('no code', orderCodeFrom(null, 'chuyen tien banh'), null)

eq('bank time is Vietnam time', parseBankTime('2024-07-02 11:08:33').toISOString(), '2024-07-02T04:08:33.000Z')

const body = JSON.stringify({
  id: 92704, gateway: 'MBBank', transactionDate: '2026-09-17 10:00:00', accountNumber: '0908123456',
  code: null, content: 'VB123456', transferType: 'in', transferAmount: 385000, accumulated: 1, referenceCode: 'FT1',
})
const sig = signWebhook(body, '1789000000', 'secret')
eq('signature verifies', verifyWebhook(body, sig, '1789000000', 'secret'), true)
eq('wrong secret fails', verifyWebhook(body, sig, '1789000000', 'other'), false)
eq('changed body fails', verifyWebhook(body.replace('385000', '3850000'), sig, '1789000000', 'secret'), false)
eq('changed timestamp fails', verifyWebhook(body, sig, '1789000001', 'secret'), false)
eq('missing header fails', verifyWebhook(body, null, '1789000000', 'secret'), false)
const tx = parseWebhook(JSON.parse(body))
eq('webhook parsed', [tx.ref, tx.amountVnd, tx.incoming, tx.code, tx.bankRef], ['92704', 385000, true, null, 'FT1'])

if (failed) {
  console.log(`\n${failed} failed`)
  process.exit(1)
}
console.log('\nall passed')
