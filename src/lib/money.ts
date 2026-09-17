/** 350000 → "350.000đ". Money is integer VND everywhere. */
export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`
}

/** 320000 → "320k", 1250000 → "1,25tr". For tight spots like cards. */
export function formatK(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}tr`
  return `${Math.round(amount / 1000)}k`
}
