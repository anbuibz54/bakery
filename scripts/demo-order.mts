/**
 * Creates a test order and prints its payment page.
 *
 *   pnpm payments:demo-order [origin]
 *
 * Uses the phone 0900000000 so test orders are easy to find and delete.
 */
import { createOrder } from '../src/server/orders/service.ts'

const origin = process.argv[2] ?? 'http://localhost:3200'
const order = await createOrder({
  phone: '0900000000',
  name: 'Khách thử',
  fulfillment: 'delivery',
  scheduledFor: new Date(Date.now() + 3 * 86_400_000),
  deliveryAddress: '12 đường số 5, P. Tân Phong, Q.7',
  deliveryFeeVnd: 35_000,
  items: [
    { productName: 'Kem dâu phô mai · 18cm', quantity: 1, unitPriceVnd: 420_000, takesDeposit: true, cakeMessage: 'Mừng sinh nhật Mẹ 60 tuổi' },
    { productName: 'Bánh táo ngàn lớp · hộp 4', quantity: 1, unitPriceVnd: 140_000, takesDeposit: false },
  ],
})
console.log(JSON.stringify({ ...order, payUrl: `${origin}/don/${order.trackToken}/thanh-toan` }, null, 2))
process.exit(0)
