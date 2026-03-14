import { CURRENCY_SYMBOL } from '@/lib/constants';

/**
 * Formats a numeric price with the app currency symbol.
 * Displays two decimal places, right-to-left friendly.
 */
export function formatPrice(value: number | string): string {
  // Supabase returns NUMERIC columns as strings; cast defensively
  // JOD uses 3 decimal places
  const formatted = Number(value).toFixed(3);
  return `${formatted} ${CURRENCY_SYMBOL}`;
}

/**
 * Returns the discounted amount saved (price - discountPrice).
 */
export function getSavingsAmount(price: number, discountPrice: number): number {
  return Math.max(0, price - discountPrice);
}

/**
 * Returns the discount percentage as an integer (e.g. 20 for 20%).
 */
export function getDiscountPercent(price: number, discountPrice: number): number {
  if (price <= 0) return 0;
  return Math.round(((price - discountPrice) / price) * 100);
}
