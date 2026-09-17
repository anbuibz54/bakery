/** 350000 → "350.000đ". Money is integer VND everywhere. */
export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`
}
