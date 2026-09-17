/**
 * Reads SePay's recent transactions and records any the webhook missed.
 *
 *   pnpm payments:reconcile [days]
 */
import { reconcileSepay } from '../src/server/payments/service.ts'

console.log(await reconcileSepay({ days: Number(process.argv[2] ?? 2) }))
process.exit(0)
