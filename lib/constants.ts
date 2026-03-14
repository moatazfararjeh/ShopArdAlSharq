// ─── App ──────────────────────────────────────────────────────────────────────
export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? 'ArdAlsharq';
export const DEFAULT_LOCALE = process.env.EXPO_PUBLIC_DEFAULT_LOCALE ?? 'ar';
export const SUPPORTED_LOCALES = ['ar', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

// ─── Currency ─────────────────────────────────────────────────────────────────
export const CURRENCY = process.env.EXPO_PUBLIC_CURRENCY ?? 'SAR';
export const CURRENCY_SYMBOL = process.env.EXPO_PUBLIC_CURRENCY_SYMBOL ?? 'د.أ';

// ─── Cart ────────────────────────────────────────────────────────────────────
export const MAX_CART_ITEM_QUANTITY = 99;
export const MIN_CART_ITEM_QUANTITY = 1;

// ─── Images ──────────────────────────────────────────────────────────────────
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_PRODUCT_IMAGES = 5;
export const PRODUCT_IMAGE_BUCKET = 'product-images';
export const CATEGORY_IMAGE_BUCKET = 'category-images';

// ─── Pagination ───────────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20;

// ─── Feature Flags ────────────────────────────────────────────────────────────
export const ENABLE_PAYMENTS = process.env.EXPO_PUBLIC_ENABLE_PAYMENTS === 'true';
export const ENABLE_SOCIAL_LOGIN = process.env.EXPO_PUBLIC_ENABLE_SOCIAL_LOGIN === 'true';
export const ENABLE_REVIEWS = process.env.EXPO_PUBLIC_ENABLE_REVIEWS === 'true';

// ─── Order Statuses ───────────────────────────────────────────────────────────
export const ORDER_STATUS_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  pending:    { ar: 'في الانتظار',          en: 'Pending',    color: '#6b7280' },
  confirmed:  { ar: 'تم تأكيد الطلب',      en: 'Confirmed',  color: '#3b82f6' },
  preparing:  { ar: 'تم تجهيز الطلب',      en: 'Preparing',  color: '#f59e0b' },
  shipped:    { ar: 'طلبك في الطريق',       en: 'On the Way', color: '#8b5cf6' },
  delivered:  { ar: 'تم الاستلام',          en: 'Delivered',  color: '#16a34a' },
  cancelled:  { ar: 'ملغي',                 en: 'Cancelled',  color: '#dc2626' },
};
