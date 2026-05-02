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
  created_at: string;
  updated_at: string;
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface Category {
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

/** Returns the localized name for a category */
export function getCategoryName(cat: Category, locale: SupportedLocale): string {
  return locale === 'ar' ? cat.name_ar : (cat.name_en ?? cat.name_ar);
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
  unit_type: 'piece' | 'kg' | 'carton' | null;
  price_per_piece: number | null;
  price_per_carton: number | null;
  price_per_kg: number | null;
  pieces_per_carton: number | null;
  created_at: string;
  updated_at: string;
  // Joined relations (optional — present when selected explicitly)
  images?: ProductImage[];
  product_images?: ProductImage[];
  categories?: { name_ar: string; name_en: string | null } | null;
}

export function getProductName(product: Product, locale: SupportedLocale): string {
  return locale === 'ar' ? product.name_ar : (product.name_en ?? product.name_ar);
}

export function getProductDescription(product: Product, locale: SupportedLocale): string | null {
  return locale === 'ar' ? product.description_ar : (product.description_en ?? product.description_ar);
}

export function hasDiscount(product: Pick<Product, 'discount_price'>): boolean {
  return product.discount_price !== null && product.discount_price !== undefined;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  selected_unit: 'piece' | 'kg' | 'carton' | null;
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
  created_at: string;
  // Joined relation (optional — present when selected with products(*))
  product?: Product | null;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
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
