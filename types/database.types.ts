/**
 * Database row types derived from the Supabase migrations in supabase/migrations/.
 *
 * Regenerate after every schema change:
 *   npx supabase gen types typescript --local > types/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ─── Enums ───────────────────────────────────────────────────────────────────
export type UserRole = 'customer' | 'admin' | 'super_admin';
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cash_on_delivery' | 'online';
export type NotificationType = 'order_update' | 'order_placed' | 'order_confirmed' | 'order_preparing' | 'order_shipped' | 'order_delivered' | 'order_cancelled' | 'promotion' | 'promo' | 'system';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type InventoryAction = 'restock' | 'sale' | 'adjustment' | 'return';

// ─── Table Row Types ─────────────────────────────────────────────────────────

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
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

export interface ProductRow {
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
}

export interface ProductImageRow {
  id: string;
  product_id: string;
  url: string;
  storage_path: string | null;
  is_primary: boolean;
  sort_order: number;
  alt_text: string | null;
  created_at: string;
}

export interface CartRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CartItemRow {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  selected_unit: 'piece' | 'kg' | 'carton' | null;
  created_at: string;
  updated_at: string;
}

export interface AddressRow {
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

export interface OrderRow {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  total_amount: number;
  delivery_fee: number;
  discount_amount: number;
  delivery_address: Json;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name_ar: string;
  product_name_en: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  created_at: string;
}

export interface FavoriteRow {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  order_id: string | null;
  type: NotificationType;
  title_ar: string;
  title_en: string;
  body_ar: string | null;
  body_en: string | null;
  data: Json | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ─── Supabase Database interface ─────────────────────────────────────────────

export interface Database {
  public: {
    PostgrestVersion: '12';
    Tables: {
      profiles:     { Row: ProfileRow;      Insert: Omit<ProfileRow, 'created_at' | 'updated_at'>;           Update: Partial<Omit<ProfileRow, 'id' | 'email' | 'created_at'>>; Relationships: [] };
      categories:   { Row: CategoryRow;     Insert: Omit<CategoryRow, 'id' | 'created_at' | 'updated_at'>;   Update: Partial<Omit<CategoryRow, 'id' | 'created_at'>>; Relationships: [] };
      products:     { Row: ProductRow;      Insert: Omit<ProductRow, 'id' | 'created_at' | 'updated_at'>;    Update: Partial<Omit<ProductRow, 'id' | 'created_at'>>; Relationships: [] };
      product_images: { Row: ProductImageRow; Insert: Omit<ProductImageRow, 'id' | 'created_at'>; Update: Partial<Omit<ProductImageRow, 'id' | 'created_at'>>; Relationships: [] };
      carts:        { Row: CartRow;         Insert: Omit<CartRow, 'id' | 'created_at' | 'updated_at'>;       Update: Partial<Pick<CartRow, never>>; Relationships: [] };
      cart_items:   { Row: CartItemRow;     Insert: Omit<CartItemRow, 'id' | 'created_at' | 'updated_at'>;   Update: Partial<Pick<CartItemRow, 'quantity'>>; Relationships: [] };
      addresses:    { Row: AddressRow;      Insert: Omit<AddressRow, 'id' | 'created_at' | 'updated_at'>;    Update: Partial<Omit<AddressRow, 'id' | 'user_id' | 'created_at'>>; Relationships: [] };
      orders:       { Row: OrderRow;        Insert: Omit<OrderRow, 'id' | 'order_number' | 'created_at' | 'updated_at'>; Update: Partial<Pick<OrderRow, 'status' | 'notes'>>; Relationships: [] };
      order_items:  { Row: OrderItemRow;    Insert: Omit<OrderItemRow, 'id' | 'total_price' | 'created_at'>; Update: Partial<Pick<OrderItemRow, never>>; Relationships: [] };
      favorites:    { Row: FavoriteRow;     Insert: Omit<FavoriteRow, 'id' | 'created_at'>;                  Update: Partial<Pick<FavoriteRow, never>>; Relationships: [] };
      reviews:      { Row: ReviewRow;       Insert: Omit<ReviewRow, 'id' | 'created_at' | 'updated_at'>;     Update: Partial<Omit<ReviewRow, 'id' | 'user_id' | 'product_id' | 'created_at'>>; Relationships: [] };
      notifications: { Row: NotificationRow; Insert: Omit<NotificationRow, 'id' | 'created_at'>; Update: Partial<Pick<NotificationRow, 'is_read' | 'read_at'>>; Relationships: [] };
    };
    Views: {};
    Functions: {
      place_order: {
        Args: { p_address_id: string; p_payment_method: PaymentMethod; p_notes?: string | null };
        Returns: Json;
      };
      is_admin: { Args: Record<never, never>; Returns: boolean };
    };
    Enums: {
      user_role:         UserRole;
      order_status:      OrderStatus;
      payment_status:    PaymentStatus;
      payment_method:    PaymentMethod;
      notification_type: NotificationType;
      review_status:     ReviewStatus;
      inventory_action:  InventoryAction;
    };
  };
}
