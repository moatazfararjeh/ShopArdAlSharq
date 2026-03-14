# ArdAlsharq — Cross-Platform Food Ordering & Product Selling Application
## Complete Implementation Planning Document

> **Version:** 1.0  
> **Date:** March 12, 2026  
> **Prepared by:** Senior Product Manager / Solution Architect / Full-Stack Technical Consultant  
> **Stack:** React Native (Expo) · Supabase · TypeScript  

---

## Table of Contents

1. [Business Analysis](#1-business-analysis)
2. [Functional Analysis](#2-functional-analysis)
3. [Technical Design](#3-technical-design)
4. [Delivery Plan](#4-delivery-plan)
5. [Governance and Quality](#5-governance-and-quality)
6. [Folder Structure](#6-folder-structure)
7. [Naming Conventions](#7-naming-conventions)
8. [Best Practices](#8-best-practices)
9. [Key Risks and Mitigation](#9-key-risks-and-mitigation)

---

## 1. Business Analysis

### 1.1 Business Goals

| # | Goal | Priority |
|---|------|----------|
| BG-01 | Enable customers to browse, search, and purchase food products online via web and mobile | Critical |
| BG-02 | Provide a streamlined, frictionless checkout experience to maximize conversion | Critical |
| BG-03 | Empower admins to manage the product catalog, categories, pricing, and discounts without developer involvement | Critical |
| BG-04 | Support discount-based promotions to increase average order value | High |
| BG-05 | Build a scalable platform capable of onboarding multiple product categories and high SKU volumes | High |
| BG-06 | Establish a reliable order management and history system for customer trust | High |
| BG-07 | Minimize infrastructure cost by leveraging a managed BaaS (Supabase) | Medium |
| BG-08 | Maintain consistent brand experience across Web and Mobile | Medium |

---

### 1.2 Business Actors

| Actor | Type | Description |
|-------|------|-------------|
| **Guest User** | External | Any unauthenticated visitor. Can browse the catalog, view categories, and read product details. Cannot add to cart or checkout. |
| **Customer** | External (Authenticated) | Registered and logged-in user. Can add to cart, checkout, track orders, and manage their profile. |
| **Admin** | Internal (Authenticated) | Privileged internal user. Can manage all products, categories, orders, pricing, discounts, image assets, and availability flags. |
| **Supabase Auth** | System | Manages user identity, sessions, JWT tokens, and role claims. |
| **Supabase Storage** | System | Manages product image assets with public/private bucket policies. |
| **Supabase Database** | System | Persists all business data with row-level security policies. |

---

### 1.3 Main Use Cases

#### Guest User
- UC-G01: Browse product catalog
- UC-G02: View product categories
- UC-G03: Search and filter products
- UC-G04: View product details (name, price, discount, images, availability)
- UC-G05: Register an account
- UC-G06: Log in to an existing account

#### Customer (Authenticated)
- UC-C01: All guest use cases
- UC-C02: Add products to cart
- UC-C03: View and modify cart
- UC-C04: Apply discounts at checkout
- UC-C05: Complete checkout and place an order
- UC-C06: View order history ("My Orders")
- UC-C07: View individual order details and status
- UC-C08: Manage profile (name, email, password)
- UC-C09: Log out

#### Admin
- UC-A01: Log in with admin credentials
- UC-A02: Create, read, update, delete (CRUD) product categories
- UC-A03: CRUD products (name, description, price, discount %, availability)
- UC-A04: Upload/replace product images
- UC-A05: Set product availability (in-stock / out-of-stock)
- UC-A06: View and manage all customer orders
- UC-A07: Update order status (pending → confirmed → preparing → shipped → delivered / cancelled)
- UC-A08: View dashboard metrics (total orders, revenue, top products)
- UC-A09: Manage admin account settings

---

### 1.4 Assumptions

| # | Assumption |
|---|-----------|
| A-01 | A single currency is used across the platform (configurable at env level). |
| A-02 | Discount is expressed as a percentage applied to the base price; the final price is computed as `price × (1 - discount_pct / 100)`. |
| A-03 | Payment integration is out of scope for MVP; order placement records intent; payment can be cash-on-delivery or added in Phase 2. |
| A-04 | A single admin role is sufficient for MVP; multi-admin with granular permissions is a Phase 2 concern. |
| A-05 | Product images are stored in Supabase Storage with public read access. |
| A-06 | The application supports Arabic and English (RTL-aware UI); initial launch may be Arabic-first. |
| A-07 | Mobile platforms targeted are iOS and Android via Expo (React Native). |
| A-08 | Web is built from the same React Native codebase using React Native Web. |
| A-09 | No delivery/logistics module is required for MVP. |
| A-10 | Each product belongs to exactly one category. |

---

### 1.5 Constraints

| # | Constraint |
|---|-----------|
| C-01 | Backend infrastructure is exclusively Supabase (PostgreSQL + Auth + Storage + Realtime). No custom backend server for MVP. |
| C-02 | Frontend is built with React Native (Expo) + TypeScript to share code across Web and Mobile. |
| C-03 | Row-Level Security (RLS) must be enabled on all Supabase tables — no table should be publicly writable without auth context. |
| C-04 | Admin interface may be a separate route/portal within the same app or a standalone web admin panel. |
| C-05 | Product images must be served via Supabase Storage CDN; no third-party image hosting. |
| C-06 | The MVP must be deliverable within a defined sprint cycle (see Section 4). |
| C-07 | Offline mode is not required for MVP. |

---

## 2. Functional Analysis

### 2.1 Module Breakdown

| Module | Code | Actors | Auth Required |
|--------|------|--------|---------------|
| Public Product Catalog | MOD-01 | Guest, Customer | No |
| Product Categories | MOD-02 | Guest, Customer | No |
| Product Detail | MOD-03 | Guest, Customer | No |
| Authentication | MOD-04 | Guest | No (to initiate) |
| Cart Management | MOD-05 | Customer | Yes |
| Checkout | MOD-06 | Customer | Yes |
| Order History | MOD-07 | Customer | Yes |
| User Profile | MOD-08 | Customer | Yes |
| Admin — Category Management | MOD-09 | Admin | Yes (Admin) |
| Admin — Product Management | MOD-10 | Admin | Yes (Admin) |
| Admin — Order Management | MOD-11 | Admin | Yes (Admin) |
| Admin — Dashboard | MOD-12 | Admin | Yes (Admin) |

---

### 2.2 Screen-by-Screen Feature Breakdown

#### MOD-01 · Public Product Catalog

**Screen: Home / Product Listing**
- Display featured/promoted products at the top (optional banner carousel)
- Product grid/list with: thumbnail image, name, original price, discount badge, discounted final price, availability indicator
- Category filter pills / horizontal scroll
- Search bar (fuzzy text search by product name)
- Infinite scroll or pagination
- Out-of-stock products shown with dimmed UI and disabled "Add to Cart"
- Language toggle (AR / EN)

---

#### MOD-02 · Product Categories

**Screen: Categories Listing**
- Grid or list of all active categories
- Each category: image, name, product count
- Tap to filter product catalog to that category

---

#### MOD-03 · Product Detail

**Screen: Product Detail Page**
- Full-size image gallery (swipeable)
- Product name, description
- Original price (strikethrough if discounted)
- Discount percentage badge
- Final calculated price (highlighted)
- Availability label (In Stock / Out of Stock)
- Quantity selector
- "Add to Cart" button (disabled for guests with prompt to login; disabled for out-of-stock)
- Category breadcrumb / tag
- Related products (same category) horizontal scroll

---

#### MOD-04 · Authentication

**Screen: Login**
- Email + password form
- Client-side validation (required, valid email, min password length)
- Error feedback (wrong credentials, account not found)
- "Forgot Password" link
- "Create Account" navigation link
- Social login placeholder (Phase 2)

**Screen: Register**
- Full name, email, password, confirm password
- Validation rules: all required, valid email, password ≥ 8 chars, passwords match
- Success → auto-login → redirect to previous page or Home
- Error feedback (email already taken)

**Screen: Forgot Password**
- Email input
- Trigger Supabase password reset email
- Confirmation message on success

---

#### MOD-05 · Cart Management

**Screen: Cart**
- List of cart items: thumbnail, name, unit price, discounted price, quantity stepper (+/−), remove button
- Subtotal per item, cart total
- Empty cart illustration with CTA to browse products
- "Proceed to Checkout" button
- Cart item count badge on nav icon (global state)

---

#### MOD-06 · Checkout

**Screen: Checkout**
- Delivery address input (name, phone, address, city, notes)
- Order summary (items, quantities, subtotal, discount applied, tax if applicable, total)
- Payment method selection (Cash on Delivery for MVP; card in Phase 2)
- "Place Order" CTA
- Success confirmation screen with order number
- Error handling for failed order creation

---

#### MOD-07 · Order History ("My Orders")

**Screen: My Orders List**
- Chronological list of all past orders
- Each row: order number, date, item count, total, status badge (color-coded)
- Filter by status (optional, Phase 2)

**Screen: Order Detail**
- Order number, placed date
- Items list with quantities and prices
- Delivery address
- Payment method
- Order total
- Current status with timestamp log (optional Phase 2)
- "Reorder" CTA (adds same items to cart)

---

#### MOD-08 · User Profile

**Screen: Profile**
- Display name, email
- Edit profile (name, phone)
- Change password
- Logout button
- Link to Order History

---

#### MOD-09 · Admin — Category Management

**Screen: Category List (Admin)**
- Table/list: category name, image, product count, active/inactive toggle, Edit / Delete actions
- "Add Category" button

**Screen: Add / Edit Category**
- Name (AR + EN)
- Upload category image
- Active/inactive toggle
- Save / Cancel

---

#### MOD-10 · Admin — Product Management

**Screen: Product List (Admin)**
- Searchable, sortable table: image, name, category, price, discount %, final price, availability toggle, Edit / Delete
- "Add Product" button

**Screen: Add / Edit Product**
- Name (AR + EN)
- Description (AR + EN)
- Category selector (dropdown)
- Base price input (numeric)
- Discount percentage input (0–100)
- Auto-computed final price display (read-only, real-time update)
- Image upload (multi-image support; first image = primary)
- Availability toggle (in-stock / out-of-stock)
- Save / Cancel / Delete

---

#### MOD-11 · Admin — Order Management

**Screen: Orders List (Admin)**
- Filterable, searchable table: order #, customer name, date, items count, total, status
- Status filter tabs: All / Pending / Confirmed / Preparing / Shipped / Delivered / Cancelled

**Screen: Order Detail (Admin)**
- Full order breakdown (same as customer view + customer contact info)
- Status update dropdown with confirmation
- Internal notes (Phase 2)

---

#### MOD-12 · Admin — Dashboard

**Screen: Dashboard**
- KPI cards: Today's Orders, Total Revenue, Active Products, New Customers
- Recent orders table (last 10)
- Top-selling products (Phase 2)
- Orders by status chart (Phase 2)

---

### 2.3 User Stories

#### Guest User Stories
```
US-G01: As a guest, I want to browse all available products so that I can explore what is offered without needing to sign up.
US-G02: As a guest, I want to filter products by category so that I can find items relevant to my interest.
US-G03: As a guest, I want to search for products by name so that I can quickly find what I'm looking for.
US-G04: As a guest, I want to see the original price, discount, and final price of each product so that I understand the deal.
US-G05: As a guest, I want to see product images so that I can make an informed decision.
US-G06: As a guest, I want to know if a product is out of stock before attempting to add it to my cart.
US-G07: As a guest, I want to register for an account so that I can shop and track my orders.
US-G08: As a guest, I want to log in so that I can access my cart and order history.
```

#### Customer Stories
```
US-C01: As a customer, I want to add products to my cart so that I can purchase multiple items in one order.
US-C02: As a customer, I want to update item quantities in my cart so that I can buy more or fewer of an item.
US-C03: As a customer, I want to remove items from my cart so that I only purchase what I intend.
US-C04: As a customer, I want to see a running cart total including all discounts so that I know exactly what I'll pay.
US-C05: As a customer, I want to enter my delivery address at checkout so that my order is delivered to the right place.
US-C06: As a customer, I want to place an order so that I can receive the products I selected.
US-C07: As a customer, I want to receive an order confirmation so that I know my order was successfully placed.
US-C08: As a customer, I want to view my order history so that I can track past purchases.
US-C09: As a customer, I want to view the full details of an order so that I can verify what was ordered.
US-C10: As a customer, I want to log out securely so that my account is protected on shared devices.
US-C11: As a customer, I want to reset my password via email so that I can regain access if I forget it.
```

#### Admin Stories
```
US-A01: As an admin, I want to add new product categories so that the catalog is logically organized.
US-A02: As an admin, I want to edit existing categories so that their information stays current.
US-A03: As an admin, I want to deactivate a category so that its products are hidden without deletion.
US-A04: As an admin, I want to add new products with full details so that customers can browse and purchase them.
US-A05: As an admin, I want to set a discount percentage on a product so that promotional pricing is applied automatically.
US-A06: As an admin, I want to toggle product availability so that out-of-stock products cannot be purchased.
US-A07: As an admin, I want to upload product images so that customers can visually evaluate products.
US-A08: As an admin, I want to view all incoming orders so that I can fulfill them promptly.
US-A09: As an admin, I want to update order status so that customers know the progress of their delivery.
US-A10: As an admin, I want to view dashboard metrics so that I have a real-time overview of business performance.
```

---

## 3. Technical Design

### 3.1 Recommended Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT LAYER                      │
│                                                     │
│   React Native (Expo) + TypeScript                  │
│   ┌──────────────┐    ┌──────────────────────────┐  │
│   │  Mobile App  │    │  Web App (RN Web / Next) │  │
│   │  iOS/Android │    │  react-native-web        │  │
│   └──────────────┘    └──────────────────────────┘  │
│                                                     │
│   State: Zustand  │  Navigation: Expo Router        │
│   Queries: TanStack Query (React Query)             │
│   Forms: React Hook Form + Zod                      │
│   Styling: NativeWind (Tailwind for RN)             │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS / WebSocket
┌─────────────────────▼───────────────────────────────┐
│                  SUPABASE (BaaS)                     │
│                                                     │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  PostgreSQL  │  │   Auth   │  │    Storage    │  │
│  │  + RLS + RPC │  │  (JWT)   │  │  (S3-compat)  │  │
│  └─────────────┘  └──────────┘  └───────────────┘  │
│  ┌─────────────┐  ┌──────────────────────────────┐  │
│  │  Realtime   │  │   Edge Functions (optional)  │  │
│  │  (WS)       │  │   (order notifications, etc) │  │
│  └─────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | React Native (Expo SDK 51+) | Single codebase for iOS, Android, and Web |
| Backend | Supabase | Managed Postgres + Auth + Storage + Realtime, zero DevOps for MVP |
| Navigation | Expo Router (file-based) | Supports deep linking, web URLs, and mobile navigation natively |
| State management | Zustand | Lightweight, minimal boilerplate, works with SSR if needed |
| Server state | TanStack Query | Caching, background refetching, optimistic updates |
| Forms | React Hook Form + Zod | Type-safe validation with minimal re-renders |
| Styling | NativeWind v4 | Tailwind CSS utility classes on React Native |
| Language | TypeScript (strict) | End-to-end type safety including generated Supabase types |

---

### 3.2 Supabase Database Schema

#### Table: `profiles`
```sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

#### Table: `categories`
```sql
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar     TEXT NOT NULL,
  name_en     TEXT NOT NULL,
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins have full access to categories"
  ON categories FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

#### Table: `products`
```sql
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_ar  TEXT,
  description_en  TEXT,
  price           NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  discount_pct    NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
  final_price     NUMERIC(10, 2) GENERATED ALWAYS AS
                    (ROUND(price * (1 - discount_pct / 100), 2)) STORED,
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view available products"
  ON products FOR SELECT USING (is_available = TRUE);

CREATE POLICY "Admins have full access to products"
  ON products FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

#### Table: `product_images`
```sql
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view product images"
  ON product_images FOR SELECT USING (TRUE);

CREATE POLICY "Admins have full access to product images"
  ON product_images FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

#### Table: `carts`
```sql
CREATE TABLE carts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)  -- one cart per user
);

-- RLS
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart"
  ON carts FOR ALL USING (auth.uid() = user_id);
```

#### Table: `cart_items`
```sql
CREATE TABLE cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, product_id)
);

-- RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart items"
  ON cart_items FOR ALL USING (
    EXISTS (SELECT 1 FROM carts WHERE id = cart_id AND user_id = auth.uid())
  );
```

#### Table: `orders`
```sql
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    TEXT NOT NULL UNIQUE DEFAULT ('ORD-' || LPAD(nextval('order_seq')::TEXT, 6, '0')),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','preparing','shipped','delivered','cancelled')),
  subtotal        NUMERIC(10, 2) NOT NULL,
  discount_total  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total           NUMERIC(10, 2) NOT NULL,
  notes           TEXT,
  payment_method  TEXT NOT NULL DEFAULT 'cash_on_delivery',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE order_seq START 1;

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins have full access to orders"
  ON orders FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

#### Table: `order_items`
```sql
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id),
  product_name    TEXT NOT NULL,  -- snapshot at order time
  unit_price      NUMERIC(10, 2) NOT NULL,
  discount_pct    NUMERIC(5, 2) NOT NULL DEFAULT 0,
  final_price     NUMERIC(10, 2) NOT NULL,
  quantity        INT NOT NULL CHECK (quantity > 0),
  line_total      NUMERIC(10, 2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order items"
  ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own order items"
  ON order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins have full access to order items"
  ON order_items FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

#### Table: `delivery_addresses`
```sql
CREATE TABLE delivery_addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  phone       TEXT NOT NULL,
  address     TEXT NOT NULL,
  city        TEXT NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS follows order ownership (same policies as order_items)
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage addresses for their orders"
  ON delivery_addresses FOR ALL USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "Admins have full access to delivery addresses"
  ON delivery_addresses FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

#### Database Triggers
```sql
-- Auto-create profile after user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- (Apply same trigger pattern to: categories, products, carts, cart_items, orders)
```

#### Schema Relationships Diagram
```
auth.users ──────── profiles (1:1)
                │
                ├── carts (1:1)
                │     └── cart_items (1:N) ──── products
                │
                └── orders (1:N)
                      ├── order_items (1:N) ─── products
                      └── delivery_addresses (1:1)

categories ──────── products (1:N)
                      └── product_images (1:N)
```

---

### 3.3 Authentication Model

**Provider:** Supabase Auth (email/password for MVP; social in Phase 2)

| Flow | Mechanism |
|------|-----------|
| Registration | `supabase.auth.signUp()` → DB trigger creates `profiles` row |
| Login | `supabase.auth.signInWithPassword()` → returns JWT session |
| Session persistence | Supabase client stores session in `AsyncStorage` (mobile) / `localStorage` (web) |
| Token refresh | Supabase client handles auto-refresh transparently |
| Logout | `supabase.auth.signOut()` → clears local session |
| Password reset | `supabase.auth.resetPasswordForEmail()` → magic link via email |
| Role detection | Read `role` field from `profiles` table after login |
| Admin guard | Server: RLS policies check role; Client: route guard checks profile.role |

**JWT Custom Claims (Phase 2 optimization):**
```sql
-- Supabase hook to inject role into JWT
CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE id = (event->>'user_id')::UUID;
  claims := event->'claims';
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  END IF;
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

---

### 3.4 Storage Strategy

**Bucket Structure:**
```
supabase-storage/
├── product-images/          (public bucket)
│   ├── {product_id}/
│   │   ├── primary.webp
│   │   └── gallery-{n}.webp
└── category-images/         (public bucket)
    └── {category_id}.webp
```

**Policies:**
```sql
-- Anyone can read public buckets
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('product-images', 'category-images'));

-- Only admins can upload/update/delete
CREATE POLICY "Admins can manage images"
  ON storage.objects FOR INSERT, UPDATE, DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

**Image handling guidelines:**
- Always upload as `.webp` for optimized web performance
- Generate signed URLs only for private content; product/category images use public URLs
- Store `url` in database as the full public CDN URL from Supabase Storage
- Maximum image size: 2MB per image; validate on client before upload

---

### 3.5 State Management

| State Type | Tool | Scope |
|-----------|------|-------|
| Server/remote data (products, orders) | TanStack Query | Auto-cached, background refresh |
| Auth session | Zustand + Supabase client | Global, persisted |
| Cart contents | Zustand + persisted to `cart_items` table | Global |
| UI/local state (modals, forms) | React `useState` / `useReducer` | Component-local |
| Navigation state | Expo Router | File-system based |

**Zustand store structure:**
```typescript
// stores/authStore.ts
interface AuthStore {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
}

// stores/cartStore.ts
interface CartStore {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (product: Product, qty: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  clearCart: () => void;
  syncWithDatabase: () => Promise<void>;
}
```

---

### 3.6 Navigation Strategy

**Expo Router (file-based routing) — recommended approach:**

```
app/
├── (public)/               # No auth required
│   ├── index.tsx           # Home / Product Listing
│   ├── categories/
│   │   └── index.tsx       # Category browser
│   ├── products/
│   │   └── [id].tsx        # Product detail
│   ├── login.tsx
│   ├── register.tsx
│   └── forgot-password.tsx
│
├── (customer)/             # Auth-guarded layout
│   ├── _layout.tsx         # Auth guard: redirect to /login if no session
│   ├── cart.tsx
│   ├── checkout.tsx
│   ├── order-success.tsx
│   ├── orders/
│   │   ├── index.tsx       # My Orders list
│   │   └── [id].tsx        # Order detail
│   └── profile.tsx
│
├── (admin)/                # Admin-guarded layout
│   ├── _layout.tsx         # Auth guard: require admin role
│   ├── dashboard.tsx
│   ├── products/
│   │   ├── index.tsx
│   │   ├── add.tsx
│   │   └── [id]/edit.tsx
│   ├── categories/
│   │   ├── index.tsx
│   │   ├── add.tsx
│   │   └── [id]/edit.tsx
│   └── orders/
│       ├── index.tsx
│       └── [id].tsx
│
└── _layout.tsx             # Root layout (providers, font loading, etc.)
```

**Route guard implementation:**
```typescript
// app/(customer)/_layout.tsx
export default function CustomerLayout() {
  const { session } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [session]);

  return <Stack />;
}

// app/(admin)/_layout.tsx
export default function AdminLayout() {
  const { session, isAdmin } = useAuthStore();

  useEffect(() => {
    if (!session) router.replace('/login');
    else if (!isAdmin) router.replace('/');
  }, [session, isAdmin]);

  return <Stack />;
}
```

---

### 3.7 Role-Based Access Model

| Resource | Guest | Customer | Admin |
|----------|-------|----------|-------|
| View products | ✅ | ✅ | ✅ |
| View categories | ✅ | ✅ | ✅ |
| View product detail | ✅ | ✅ | ✅ |
| Add to cart | ❌ | ✅ | ✅ |
| Checkout / Place order | ❌ | ✅ | ✅ |
| View own orders | ❌ | ✅ | ✅ |
| Manage own profile | ❌ | ✅ | ✅ |
| CRUD products | ❌ | ❌ | ✅ |
| CRUD categories | ❌ | ❌ | ✅ |
| View all orders | ❌ | ❌ | ✅ |
| Update order status | ❌ | ❌ | ✅ |
| View dashboard | ❌ | ❌ | ✅ |
| Manage product images | ❌ | ❌ | ✅ |

**Enforcement layers (defense in depth):**
1. **Client routing** — route guards in `_layout.tsx` redirect unauthorized users
2. **Supabase RLS** — database-level policies prevent unauthorized data access/mutation
3. **Storage policies** — bucket-level policies prevent unauthorized file operations
4. **API layer** — all Supabase calls go through typed service classes that enforce context

---

## 4. Delivery Plan

### 4.1 MVP Scope

The MVP includes everything required to demonstrate a fully functional end-to-end purchase flow:

| Included in MVP | Excluded from MVP (Phase 2+) |
|----------------|------------------------------|
| Public product browsing | Payment gateway integration |
| Category filtering + search | Social login (Google, Apple) |
| Product detail with pricing/discount | Push notifications |
| Email/password authentication | Delivery tracking |
| Cart management | Coupons / promo codes |
| Checkout (Cash on Delivery) | Product reviews & ratings |
| Order history | Multiple admin roles |
| Admin: product CRUD | Analytics dashboard charts |
| Admin: category CRUD | Wishlist / favorites |
| Admin: order status updates | Loyalty / points program |
| Admin basic dashboard (counts) | Real-time order updates (websocket) |
| RTL support (Arabic-first) | Multi-language CMS |

---

### 4.2 Sprint Breakdown

> Assumes 2-week sprints with 1 developer or a small team.

#### Sprint 0 — Project Setup (Week 1)
- [ ] Initialize Expo + TypeScript project
- [ ] Configure NativeWind, Expo Router, Supabase client
- [ ] Set up Supabase project: run schema migrations, configure Auth, Storage buckets
- [ ] Generate Supabase TypeScript types (`supabase gen types typescript`)
- [ ] Set up folder structure, ESLint, Prettier, Husky
- [ ] Configure `.env` and env validation
- [ ] Add Zustand stores (auth, cart) skeleton
- [ ] Add TanStack Query provider
- [ ] Set up basic CI (GitHub Actions: lint + type-check)

**Milestone M0:** Project scaffold ready to develop features.

---

#### Sprint 1 — Authentication + Public Catalog (Weeks 2–3)
- [ ] Login screen + Register screen + Forgot Password
- [ ] Supabase Auth integration with profile trigger
- [ ] Auth store with session persistence
- [ ] Route guards for customer and admin layouts
- [ ] Categories listing screen
- [ ] Product listing screen with category filter
- [ ] Product detail screen (read-only)
- [ ] Product image gallery

**Milestone M1:** Guest can browse catalog; user can register and log in.

---

#### Sprint 2 — Cart + Checkout + Orders (Weeks 4–5)
- [ ] Cart screen with add/remove/quantity controls
- [ ] Cart store sync with `cart_items` table
- [ ] Checkout screen with address form + Zod validation
- [ ] Place order (transaction: insert order + order_items + delivery_address + clear cart)
- [ ] Order success confirmation screen
- [ ] My Orders list + Order detail screens

**Milestone M2:** Authenticated customer can complete a full purchase flow.

---

#### Sprint 3 — Admin Panel (Weeks 6–7)
- [ ] Admin route guard
- [ ] Admin layout with sidebar/tab navigation
- [ ] Category list + Add/Edit/Delete with image upload
- [ ] Product list with search + filters
- [ ] Add/Edit product form with computed final price
- [ ] Product image upload via Supabase Storage
- [ ] Availability toggle (inline in list)
- [ ] Admin order list with status filter tabs
- [ ] Admin order detail + status update

**Milestone M3:** Admin can manage full catalog and orders.

---

#### Sprint 4 — Polish + QA + Launch (Weeks 8–9)
- [ ] Admin dashboard KPI cards (today's orders, revenue, active products)
- [ ] RTL layout audit and fixes
- [ ] Empty states and loading skeletons for all screens
- [ ] Error boundary and global error handling
- [ ] Form validation refinements
- [ ] Deep link testing on iOS/Android/Web
- [ ] Performance profiling (memo, lazy loading)
- [ ] Security audit: RLS policy review, input sanitization
- [ ] E2E test coverage for critical flows
- [ ] App store metadata + icons + splash screen
- [ ] Staging deployment + UAT with stakeholders

**Milestone M4 (MVP Launch):** Production-ready MVP deployed on App Store, Play Store, and Web.

---

### 4.3 Future Phases

#### Phase 2 — Enhanced Commerce (Post-MVP)
- Payment gateway (Stripe, Tap, PayTabs)
- Promo codes / coupon system
- Product reviews and star ratings
- Wishlist / favorites
- Push notifications (order status updates via Expo Notifications + Supabase Edge Functions)
- Social login (Google, Apple)
- Reorder functionality

#### Phase 3 — Growth & Personalization
- Loyalty points program
- Product recommendations (based on order history)
- Advanced admin analytics with charts
- Multi-language CMS (admin-editable translations)
- Scheduled promotional pricing (time-boxed discounts)

#### Phase 4 — Scale & Operations
- Delivery partner integration / logistics API
- Multiple admin roles (super-admin, fulfillment staff, content manager)
- Inventory management (stock count tracking)
- Bulk product import/export (CSV)
- Advanced reporting and export

---

### 4.4 Priorities (MoSCoW)

| Feature | Priority |
|---------|----------|
| Product browsing (guest) | Must Have |
| Authentication (email/password) | Must Have |
| Cart management | Must Have |
| Checkout (Cash on Delivery) | Must Have |
| Order history | Must Have |
| Admin product/category management | Must Have |
| Admin order status management | Must Have |
| RTL / Arabic support | Must Have |
| Product images | Must Have |
| Discount pricing | Must Have |
| Admin dashboard (basic KPIs) | Should Have |
| Product search | Should Have |
| Password reset via email | Should Have |
| Out-of-stock handling | Should Have |
| Payment gateway | Could Have (Phase 2) |
| Promo codes | Could Have (Phase 2) |
| Product reviews | Won't Have (MVP) |
| Loyalty program | Won't Have (MVP) |

---

## 5. Governance and Quality

### 5.1 Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Unauthorized data access | Row-Level Security enabled on ALL tables; no table is public-writable without RLS |
| Admin privilege escalation | `role` field in `profiles` is not user-editable (RLS INSERT/UPDATE policies exclude `role`); admin assignment is manual via dashboard |
| XSS (Web) | React/RN escapes output by default; never use `dangerouslySetInnerHTML` without sanitization |
| SQL Injection | Supabase client uses parameterized queries; never concatenate user input into raw SQL |
| Sensitive data exposure | Never log tokens or passwords; use Supabase env vars exclusively in server/build context |
| IDOR (Insecure Direct Object Reference) | All queries filter by `auth.uid()`; RLS prevents accessing other users' data |
| Image upload abuse | Validate MIME type and file size client-side and via storage policies; restrict bucket write access to admins |
| Brute-force login | Supabase Auth has built-in rate limiting; consider adding CAPTCHA on registration (Phase 2) |
| CSRF | Not applicable for stateless JWT-based SPA architecture |
| Environment secrets | All API keys in `.env` files; `.env` excluded from git via `.gitignore`; use `EXPO_PUBLIC_` prefix for client-safe vars only |

---

### 5.2 Performance Considerations

| Area | Strategy |
|------|----------|
| Image loading | Use `expo-image` with priority hints, caching, and progressive loading; serve WebP from CDN |
| Product list rendering | `FlashList` instead of `FlatList` for virtualized, high-performance list rendering |
| Data fetching | TanStack Query caches and deduplicates requests; use `staleTime` appropriate to content change frequency |
| Bundle size | Expo tree-shaking; lazy-load admin routes (they aren't needed for most users) |
| Database queries | Index foreign keys (`category_id`, `user_id`, `cart_id`, `order_id`); add composite index on `products(is_available, category_id)` |
| Supabase query optimization | Use `.select()` to request only needed columns; avoid N+1 by using joins or `.select('*, images(*)')` |
| Final price | Computed as a generated column in DB to avoid application-level calculation drift |
| Web performance | Enable Expo Web static rendering where possible; use `<Image>` with `priority` for above-the-fold content |

**Recommended database indexes:**
```sql
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_available ON products(is_available);
CREATE INDEX idx_products_category_available ON products(category_id, is_available);
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_product_images_product ON product_images(product_id);
```

---

### 5.3 Validation Rules

#### Product
| Field | Rule |
|-------|------|
| `name_ar` / `name_en` | Required, 2–100 characters |
| `price` | Required, numeric, ≥ 0, max 2 decimal places |
| `discount_pct` | Numeric, 0–100, defaults to 0 |
| `category_id` | Required, must reference an existing active category |
| Image | Optional; if uploaded: MIME must be image/*, max 2MB |

#### Customer Checkout
| Field | Rule |
|-------|------|
| Full name | Required, 2–80 characters |
| Phone | Required, valid international or local format |
| Address | Required, 5–200 characters |
| City | Required, 2–50 characters |
| Cart | Must have ≥ 1 item; all items must be currently available |

#### Authentication
| Field | Rule |
|-------|------|
| Email | Required, valid RFC 5322 email |
| Password (register) | Required, min 8 characters, at least 1 letter and 1 number (recommended) |
| Password confirm | Must match password |

---

### 5.4 Error Handling

**Strategy: centralized, typed, user-friendly errors**

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number
  ) {
    super(message);
  }
}

// services/productService.ts — example pattern
export async function getProducts(filters: ProductFilters) {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:categories(*), images:product_images(*)')
    .eq('is_available', true);

  if (error) {
    throw new AppError('PRODUCTS_FETCH_FAILED', error.message);
  }
  return data;
}
```

**Error categories:**
| Category | Handling |
|----------|---------|
| Network errors | TanStack Query retry (3 attempts with exponential backoff); show "retry" UI |
| Auth errors | Redirect to login; clear stale session |
| Validation errors | Inline field-level error messages via React Hook Form |
| Server errors (5xx) | Global error boundary; user-friendly generic message; log to console in dev |
| Not found (404) | Redirect to home or show "product not found" state |
| Optimistic update failure | TanStack Query rollback; show toast notification |

---

### 5.5 Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|----------------|
| Unit tests (hooks, utils, stores) | Jest + React Native Testing Library | 80% for business logic |
| Component tests | RNTL — render + interaction tests | Key interactive components |
| API/service tests | Jest with Supabase mock | All service functions |
| E2E tests | Maestro (mobile) / Playwright (web) | Critical user flows |
| Type safety | TypeScript strict mode + generated Supabase types | 100% — no `any` |
| Linting | ESLint + Prettier | 0 errors in CI |

**Critical E2E flows to test:**
1. Guest browses catalog → views product detail → prompted to login
2. Register → login → add to cart → checkout → view order
3. Admin login → add product with image → verify on public catalog
4. Admin update order status → verify in customer's order history

---

## 6. Folder Structure

```
ardalsharq/
├── app/                          # Expo Router screens
│   ├── (public)/
│   │   ├── index.tsx             # Home / product listing
│   │   ├── categories/
│   │   │   └── index.tsx
│   │   ├── products/
│   │   │   └── [id].tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (customer)/
│   │   ├── _layout.tsx           # Auth guard
│   │   ├── cart.tsx
│   │   ├── checkout.tsx
│   │   ├── order-success.tsx
│   │   ├── orders/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   └── profile.tsx
│   ├── (admin)/
│   │   ├── _layout.tsx           # Admin guard
│   │   ├── dashboard.tsx
│   │   ├── products/
│   │   │   ├── index.tsx
│   │   │   ├── add.tsx
│   │   │   └── [id]/
│   │   │       └── edit.tsx
│   │   ├── categories/
│   │   │   ├── index.tsx
│   │   │   ├── add.tsx
│   │   │   └── [id]/
│   │   │       └── edit.tsx
│   │   └── orders/
│   │       ├── index.tsx
│   │       └── [id].tsx
│   └── _layout.tsx               # Root layout
│
├── components/                   # Shared UI components
│   ├── ui/                       # Primitives (Button, Input, Badge, etc.)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── index.ts
│   ├── product/
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductImageGallery.tsx
│   │   └── PriceDisplay.tsx
│   ├── cart/
│   │   ├── CartItem.tsx
│   │   └── CartSummary.tsx
│   ├── order/
│   │   ├── OrderCard.tsx
│   │   ├── OrderStatusBadge.tsx
│   │   └── OrderItemRow.tsx
│   ├── category/
│   │   └── CategoryCard.tsx
│   ├── admin/
│   │   ├── DataTable.tsx
│   │   ├── ImageUploader.tsx
│   │   └── StatCard.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── TabBar.tsx
│       └── AdminSidebar.tsx
│
├── hooks/                        # Custom React hooks
│   ├── useProducts.ts
│   ├── useCategories.ts
│   ├── useCart.ts
│   ├── useOrders.ts
│   ├── useAuth.ts
│   └── useAdminOrders.ts
│
├── services/                     # Supabase API calls (typed)
│   ├── productService.ts
│   ├── categoryService.ts
│   ├── cartService.ts
│   ├── orderService.ts
│   ├── authService.ts
│   └── storageService.ts
│
├── stores/                       # Zustand stores
│   ├── authStore.ts
│   └── cartStore.ts
│
├── lib/                          # Core utilities
│   ├── supabase.ts               # Supabase client init
│   ├── queryClient.ts            # TanStack Query client
│   ├── errors.ts                 # Error types
│   └── constants.ts              # App-wide constants
│
├── types/                        # TypeScript types
│   ├── database.types.ts         # Auto-generated by Supabase CLI
│   ├── models.ts                 # Derived/business models
│   └── navigation.ts             # Route param types
│
├── utils/                        # Pure utility functions
│   ├── formatPrice.ts
│   ├── formatDate.ts
│   ├── calculateDiscount.ts
│   └── validators.ts
│
├── schemas/                      # Zod validation schemas
│   ├── authSchema.ts
│   ├── productSchema.ts
│   ├── checkoutSchema.ts
│   └── categorySchema.ts
│
├── i18n/                         # Internationalization
│   ├── index.ts
│   ├── ar.json                   # Arabic translations
│   └── en.json                   # English translations
│
├── assets/                       # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── supabase/                     # Supabase project config
│   ├── migrations/               # SQL migration files
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   └── 003_indexes.sql
│   └── seed.sql                  # Dev seed data
│
├── __tests__/                    # Test files
│   ├── unit/
│   ├── components/
│   └── e2e/
│
├── .env                          # Local env (gitignored)
├── .env.example                  # Env template (committed)
├── app.json                      # Expo config
├── tailwind.config.js            # NativeWind config
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
└── package.json
```

---

## 7. Naming Conventions

### Files and Directories
| Item | Convention | Example |
|------|-----------|---------|
| Screen components | PascalCase `.tsx` | `ProductDetail.tsx` |
| Shared components | PascalCase `.tsx` | `ProductCard.tsx` |
| Hooks | camelCase, `use` prefix | `useProducts.ts` |
| Services | camelCase, `Service` suffix | `productService.ts` |
| Stores | camelCase, `Store` suffix | `cartStore.ts` |
| Utilities | camelCase | `formatPrice.ts` |
| Zod schemas | camelCase, `Schema` suffix | `checkoutSchema.ts` |
| Types/interfaces | PascalCase | `Product`, `CartItem` |
| Enums | PascalCase | `OrderStatus` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_IMAGE_SIZE_MB` |
| Route files (Expo Router) | kebab-case | `order-success.tsx`, `[id].tsx` |
| SQL migrations | numbered prefix + description | `001_initial_schema.sql` |

### TypeScript Conventions
```typescript
// Types — PascalCase interfaces, no "I" prefix
interface Product {
  id: string;
  name_ar: string;
  name_en: string;
  price: number;
  discountPct: number;
  finalPrice: number;
  isAvailable: boolean;
}

// Enums — PascalCase
enum OrderStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Preparing = 'preparing',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

// Service functions — verb-first camelCase
async function getProductById(id: string): Promise<Product>
async function createOrder(payload: CreateOrderPayload): Promise<Order>
async function updateOrderStatus(id: string, status: OrderStatus): Promise<void>

// Hooks — use-prefixed camelCase
function useProducts(filters?: ProductFilters): UseQueryResult<Product[]>
function useCart(): CartStore
```

### Database Naming
- Tables: `snake_case`, plural nouns (`products`, `order_items`)
- Columns: `snake_case` (`created_at`, `discount_pct`, `is_available`)
- Foreign keys: `{table_singular}_id` (`product_id`, `category_id`)
- Boolean columns: `is_` prefix (`is_available`, `is_active`, `is_primary`)
- Timestamps: `created_at`, `updated_at`
- Indexes: `idx_{table}_{column(s)}` (`idx_products_category`)
- RLS policies: descriptive English sentence (as shown in schema)

---

## 8. Best Practices

### Code Quality
- **TypeScript strict mode** — `"strict": true` in `tsconfig.json`; no `any` types
- **Generated types** — run `supabase gen types typescript` after every schema change and commit the output
- **No direct Supabase calls in components** — all DB access goes through `services/` layer
- **Custom hooks for data fetching** — components consume `useProducts()`, never call service functions directly
- **Zod for all external data** — validate API responses and form inputs at boundaries
- **Component composition over prop drilling** — use React Context or Zustand for cross-tree state

### Supabase Best Practices
- Always use `.select('specific, columns')` — avoid `SELECT *` for performance
- Use transactions (RPC functions) for multi-table writes (e.g., place order: insert order + items + address + clear cart atomically)
- Enable RLS on ALL tables from day one — never ship a table without policies
- Store business logic in DB triggers/functions where it prevents data inconsistency (e.g., `final_price` generated column)
- Snapshot product data in `order_items` at order creation — never rely on joining back to `products` for historical order display

### React Native / Expo Best Practices
- `FlashList` over `FlatList` for lists with many items
- `expo-image` over `Image` for caching, performance, and placeholder support
- Memoize expensive computations and stable callback references (`useMemo`, `useCallback`)
- Separate navigation types for type-safe `router.push()`
- Use `Platform.OS` sparingly; prefer unified components with platform-adaptive styles via NativeWind

### Git and CI/CD
- Protect `main` branch — require PR reviews
- Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- CI pipeline: lint → type-check → unit tests → (E2E on merge to main)
- Separate `.env` per environment: `.env.local`, `.env.staging`, `.env.production`
- Never commit `.env`; always commit `.env.example`

### RTL (Right-to-Left) Best Practices
- Use `I18nManager.isRTL` or NativeWind's `rtl:` variant for direction-sensitive styles
- Prefer `start`/`end` over `left`/`right` in styles (maps automatically to RTL)
- Test all screens in both LTR and RTL from the start — retrofitting RTL is costly
- Use `i18n` library (e.g., `expo-localization` + `i18next`) from Sprint 0

---

## 9. Key Risks and Mitigation Plan

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| R-01 | RLS misconfiguration exposes customer data | Medium | Critical | Security review checklist per table; automated RLS policy tests; penetration test before launch |
| R-02 | Cart state diverges between local Zustand and DB | Medium | High | Sync cart on every app foreground event; merge strategy: DB is source of truth on conflict |
| R-03 | Product prices change after items are added to cart | Medium | High | Snapshot `final_price` at checkout time, not at add-to-cart time; warn customer if price changed |
| R-04 | Supabase free tier limits hit in production | Low | High | Monitor usage from day 1; set up billing alerts; plan upgrade budget before launch |
| R-05 | Image uploads slow on mobile (large files) | High | Medium | Client-side compression (`expo-image-manipulator`) before upload; enforce 2MB limit |
| R-06 | RTL layout issues discovered late | Medium | Medium | Test RTL in Sprint 1; establish responsive RTL component standards early |
| R-07 | Admin accidentally deletes products with order history | Low | High | Soft-delete pattern for products (`deleted_at` column) instead of hard DELETE; cascade rules reviewed |
| R-08 | Expo SDK upgrade compatibility break | Low | Medium | Pin Expo SDK version; plan upgrade windows between phases; follow Expo SDK changelog |
| R-09 | Scope creep delaying MVP | High | High | Strict MoSCoW prioritization; weekly backlog grooming; freeze MVP scope after Sprint 1 |
| R-10 | No automated test coverage for checkout flow | Medium | High | Define E2E test for checkout as Sprint 2 acceptance criterion |
| R-11 | Order number collisions under concurrent load | Low | Medium | Use PostgreSQL sequence (`order_seq`) — atomic and collision-free |
| R-12 | Mobile app store rejection | Low | Medium | Follow App Store / Play Store guidelines from start; test payments compliance for Phase 2 |

---

## Appendix A — Environment Variables Template

```bash
# .env.example

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App config
EXPO_PUBLIC_APP_NAME=ArdAlsharq
EXPO_PUBLIC_DEFAULT_LOCALE=ar
EXPO_PUBLIC_CURRENCY=SAR
EXPO_PUBLIC_CURRENCY_SYMBOL=﷼

# Feature flags (Phase 2)
EXPO_PUBLIC_ENABLE_PAYMENTS=false
EXPO_PUBLIC_ENABLE_SOCIAL_LOGIN=false
```

---

## Appendix B — Key Dependencies

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.0.0",
    "react-native": "0.74.x",
    "@supabase/supabase-js": "^2.x",
    "zustand": "^4.x",
    "@tanstack/react-query": "^5.x",
    "react-hook-form": "^7.x",
    "zod": "^3.x",
    "nativewind": "^4.x",
    "expo-image": "~1.x",
    "@shopify/flash-list": "^1.x",
    "expo-localization": "~15.x",
    "i18next": "^23.x",
    "react-i18next": "^14.x",
    "expo-image-manipulator": "~12.x",
    "expo-file-system": "~17.x",
    "@react-native-async-storage/async-storage": "^1.x"
  },
  "devDependencies": {
    "typescript": "~5.x",
    "@types/react": "~18.x",
    "eslint": "^8.x",
    "prettier": "^3.x",
    "jest": "^29.x",
    "@testing-library/react-native": "^12.x",
    "husky": "^9.x",
    "supabase": "^1.x"
  }
}
```

---

## Appendix C — Recommended Supabase CLI Commands

```bash
# Initialize Supabase project locally
supabase init

# Start local Supabase stack (Docker)
supabase start

# Apply migrations
supabase db push

# Generate TypeScript types from schema
supabase gen types typescript --local > types/database.types.ts

# Pull remote schema changes
supabase db pull

# Run seed data
supabase db seed

# Deploy to production
supabase db push --db-url $PRODUCTION_DB_URL
```

---

*Document Status: **FINAL DRAFT — Ready for team review and sprint kickoff.***  
*Next Step: Validate assumptions A-01 through A-10 with stakeholders, then initiate Sprint 0.*
