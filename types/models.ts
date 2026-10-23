/**
 * Derived business models — clean types used throughout the UI.
 * Property names mirror the database column names (snake_case).
 */

import { OrderStatus, PaymentMethod, PaymentStatus, UserRole } from './database.types';
import { SupportedLocale } from '@/lib/constants';

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  company_name: string | null;
  commercial_register_number: string | null;
  commercial_register_url: string | null;
  role: UserRole;
  expo_push_token: string | null;
  /** Where the account was created; null for accounts before tracking. */
  signup_source?: 'web' | 'ios' | 'android' | null;
  signup_app_version?: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface Section {
  id: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  section_id: string | null;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Returns the localized name for a category */
export function getCategoryName(cat: Category, locale: SupportedLocale): string {
  return locale === 'ar' ? cat.name_ar : (cat.name_en ?? cat.name_ar);
}

export function getSectionName(section: Section, locale: SupportedLocale): string {
  return locale === 'ar' ? section.name_ar : (section.name_en ?? section.name_ar);
}

// ─── Selling units ───────────────────────────────────────────────────────────
// Each product is sold in one or more units (product_units table), each with
// its own price, optional sale price and minimum quantity. One unit is the
// default: it is what listings show and what a cart line without a unit uses.

export type SaleUnit = 'piece' | 'kg' | 'carton' | 'tin';

export const SALE_UNITS: SaleUnit[] = ['piece', 'kg', 'carton', 'tin'];

export const UNIT_LABELS: Record<SaleUnit, string> = {
  piece: 'حبة',
  kg: 'كيلو',
  carton: 'كرتون',
  tin: 'تنك',
};

export interface ProductUnit {
  id: string;
  product_id: string;
  unit: SaleUnit;
  price: number;
  sale_price: number | null;
  /** null = the sale has no end date. */
  sale_ends_at: string | null;
  min_qty: number;
  /** Pieces inside one unit (e.g. 12 per carton). */
  pieces_per_unit: number | null;
  is_default: boolean;
  sort_order: number;
}

type UnitSource = Pick<Product,
  'id' | 'price' | 'discount_price' | 'flash_sale_price' | 'flash_sale_ends_at' | 'unit_type' |
  'price_per_piece' | 'price_per_kg' | 'price_per_carton' | 'pieces_per_carton' | 'min_order_quantity'
> & Partial<Pick<Product, 'product_units' | 'min_order_quantity_piece' | 'min_order_quantity_kg' | 'min_order_quantity_carton'>>;

/**
 * The product's units, default first. Falls back to the legacy price columns
 * when the query didn't include product_units (they are kept in sync).
 */
export function getProductUnits(product: UnitSource): ProductUnit[] {
  if (product.product_units?.length) {
    return [...product.product_units].sort((a, b) =>
      Number(b.is_default) - Number(a.is_default) || a.sort_order - b.sort_order);
  }
  const legacy: ProductUnit[] = [];
  const add = (unit: SaleUnit, price: number | null | undefined, minQty: number | null | undefined, pieces: number | null = null) => {
    if (price == null || price <= 0) return;
    legacy.push({
      id: `legacy-${unit}`, product_id: product.id, unit, price, sale_price: null, sale_ends_at: null,
      min_qty: Math.max(1, minQty ?? product.min_order_quantity ?? 1), pieces_per_unit: pieces,
      is_default: false, sort_order: legacy.length,
    });
  };
  add('piece', product.price_per_piece, product.min_order_quantity_piece);
  add('kg', product.price_per_kg, product.min_order_quantity_kg);
  add('carton', product.price_per_carton, product.min_order_quantity_carton, product.pieces_per_carton);
  if (!legacy.length) add((product.unit_type as SaleUnit) ?? 'piece', product.price, product.min_order_quantity);
  const def = legacy.find((u) => u.unit === product.unit_type) ?? legacy[0];
  if (def) {
    def.is_default = true;
    // Old model: one product-level discount, scaled to each unit.
    const flash = !!product.flash_sale_price && !!product.flash_sale_ends_at && new Date(product.flash_sale_ends_at) > new Date();
    const disc = flash ? product.flash_sale_price : product.discount_price;
    if (disc != null && product.price > 0) {
      legacy.forEach((u) => {
        const sale = Math.round(u.price * (disc / product.price) * 1000) / 1000;
        if (sale > 0 && sale < u.price) { u.sale_price = sale; u.sale_ends_at = flash ? product.flash_sale_ends_at : null; }
      });
    }
  }
  return legacy.sort((a, b) => Number(b.is_default) - Number(a.is_default));
}

/** The unit for a cart line / selection; null means the default unit. */
export function findProductUnit(product: UnitSource, unit?: SaleUnit | null): ProductUnit | undefined {
  const units = getProductUnits(product);
  return (unit ? units.find((u) => u.unit === unit) : undefined) ?? (unit ? undefined : units[0]);
}

export function isUnitOnSale(unit: Pick<ProductUnit, 'sale_price' | 'sale_ends_at'>): boolean {
  return unit.sale_price != null && (!unit.sale_ends_at || new Date(unit.sale_ends_at) > new Date());
}

/** What the customer pays for one unit right now. */
export function getUnitPrice(unit: Pick<ProductUnit, 'price' | 'sale_price' | 'sale_ends_at'>): number {
  return isUnitOnSale(unit) ? unit.sale_price! : unit.price;
}

/** "كرتون (12 حبة)" */
export function getUnitLabel(unit: Pick<ProductUnit, 'unit' | 'pieces_per_unit'> | { unit: string | null; pieces_per_unit?: number | null }): string {
  const base = unit.unit ? (UNIT_LABELS[unit.unit as SaleUnit] ?? unit.unit) : '';
  return unit.pieces_per_unit && unit.unit !== 'piece' ? `${base} (${unit.pieces_per_unit} حبة)` : base;
}

/** Minimum order quantity for the chosen unit (default unit when null). */
export function getMinOrderQuantity(product: UnitSource, unit?: SaleUnit | null): number {
  return Math.max(1, findProductUnit(product, unit)?.min_qty ?? product.min_order_quantity ?? 1);
}

/** Price for one of the chosen unit, with its own sale applied. */
export function getEffectiveUnitPrice(product: UnitSource, unit: SaleUnit | null): number {
  const u = findProductUnit(product, unit);
  return u ? getUnitPrice(u) : product.price;
}

// ─── Banner ──────────────────────────────────────────────────────────────────

export interface Banner {
  id: string;
  title_ar: string;
  title_en: string | null;
  subtitle_ar: string | null;
  subtitle_en: string | null;
  label_ar: string | null;
  label_en: string | null;
  button_text_ar: string | null;
  button_text_en: string | null;
  emoji: string | null;
  image_url: string | null;
  bg_color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  /** 'product' → navigate to product detail, 'category' → filter by category */
  link_type: 'product' | 'category' | null;
  /** product_id or category_id */
  link_value: string | null;
}

export function getBannerTitle(banner: Banner, locale: SupportedLocale): string {
  return locale === 'ar' ? banner.title_ar : (banner.title_en ?? banner.title_ar);
}

export function getBannerLabel(banner: Banner, locale: SupportedLocale): string | null {
  return locale === 'ar' ? banner.label_ar : (banner.label_en ?? banner.label_ar);
}

export function getBannerButtonText(banner: Banner, locale: SupportedLocale): string | null {
  return locale === 'ar' ? banner.button_text_ar : (banner.button_text_en ?? banner.button_text_ar);
}

// ─── Brand ───────────────────────────────────────────────────────────────────

export interface Brand {
  id: string;
  name: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

// ─── Product ─────────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  storage_path: string | null;
  is_primary: boolean;
  sort_order: number;
  alt_text: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  category_id: string;
  brand_id: string | null;
  section_id: string | null;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  slug: string;
  price: number;
  discount_price: number | null;
  stock_quantity: number;
  is_available: boolean;
  is_featured: boolean;
  weight: number | null;
  weight_unit: string | null;
  unit_type: 'piece' | 'kg' | 'carton' | 'tin' | null;
  price_per_piece: number | null;
  price_per_carton: number | null;
  price_per_kg: number | null;
  pieces_per_carton: number | null;
  erp_code: string | null;
  min_order_quantity: number;
  min_order_quantity_piece: number | null;
  min_order_quantity_kg: number | null;
  min_order_quantity_carton: number | null;
  flash_sale_price: number | null;
  flash_sale_ends_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations (optional — present when selected explicitly)
  images?: ProductImage[];
  product_images?: ProductImage[];
  categories?: { name_ar: string; name_en: string | null; image_url?: string | null } | null;
  brands?: { name: string } | null;
  product_units?: ProductUnit[];
}

export function getProductName(product: Product, locale: SupportedLocale): string {
  return locale === 'ar' ? product.name_ar : (product.name_en ?? product.name_ar);
}

export function getProductDescription(product: Product, locale: SupportedLocale): string | null {
  return locale === 'ar' ? product.description_ar : (product.description_en ?? product.description_ar);
}

/** Whether the default unit is on sale right now. */
export function hasDiscount(product: UnitSource): boolean {
  const u = findProductUnit(product);
  return !!u && isUnitOnSale(u);
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  selected_unit: SaleUnit | null;
  product: Product;
}

export interface CartSummary {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  total: number;
}

// ─── Address ─────────────────────────────────────────────────────────────────

export interface Address {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  city: string;
  district: string | null;
  street: string | null;
  building_number: string | null;
  floor_number: string | null;
  apartment_number: string | null;
  notes: string | null;
  is_default: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Order ───────────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_ar: string;
  product_name_en: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  /** Unit bought (null for orders placed before per-unit pricing). */
  unit: SaleUnit | null;
  pieces_per_unit: number | null;
  created_at: string;
  // Joined relation (optional — present when selected with products(*))
  product?: Product | null;
}

export type OrderSource = 'web' | 'ios' | 'android';

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  web: 'الموقع',
  ios: 'آيفون',
  android: 'أندرويد',
};

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  /** Where it was placed; null for orders before tracking (and old app versions). */
  source?: OrderSource | null;
  /** "1.9.0 (44)" on phones, "1.9.0" on the web. */
  app_version?: string | null;
  total_amount: number;
  delivery_fee: number;
  discount_amount: number;
  delivery_address: Record<string, unknown>;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations (optional) — both naming conventions for compatibility
  order_items?: OrderItem[];
  items?: OrderItem[];
  profile?: { full_name: string | null; phone: string | null; email: string; company_name: string | null } | null;
}

// ─── Checkout Payload ────────────────────────────────────────────────────────

export interface CheckoutPayload {
  address_id: string;
  payment_method: PaymentMethod;
  notes?: string | null;
}

export interface PlaceOrderResult {
  order_id: string;
  order_number: string;
  total_amount: number;
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: string;
  title_ar: string;
  title_en: string;
  body_ar: string | null;
  body_en: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  order_id: string | null;
}
