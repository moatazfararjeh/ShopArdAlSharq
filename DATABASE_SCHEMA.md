# ArdAlsharq — Complete Database Schema Design

> **Version:** 1.0  
> **Date:** March 12, 2026  
> **Database:** PostgreSQL via Supabase  
> **Reference:** PROJECT_PLANNING.md · MODULE_BREAKDOWN.md  
> **Status:** Production-Ready Baseline

---

## Table of Contents

1. [Enums](#1-enums)
2. [Table List](#2-table-list)
3. [Table Definitions](#3-table-definitions)
4. [Indexes](#4-indexes)
5. [Triggers and Functions](#5-triggers-and-functions)
6. [Row-Level Security Policies](#6-row-level-security-policies)
7. [Soft Delete Strategy](#7-soft-delete-strategy)
8. [Relationships Summary](#8-relationships-summary)
9. [DBML Schema](#9-dbml-schema)
10. [Migration Execution Order](#10-migration-execution-order)
11. [Extensibility Notes](#11-extensibility-notes)

---

## 1. Enums

Enums enforce referential integrity at the database level and prevent invalid state values.

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM: user_role
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'customer',
  'admin'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM: order_status
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE order_status AS ENUM (
  'pending',       -- Placed, awaiting admin confirmation
  'confirmed',     -- Admin confirmed the order
  'preparing',     -- Being prepared / packed
  'shipped',       -- Dispatched to delivery
  'delivered',     -- Received by customer
  'cancelled'      -- Cancelled at any pre-delivery stage
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM: payment_status
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE payment_status AS ENUM (
  'pending',       -- Awaiting payment confirmation
  'paid',          -- Payment successfully received
  'failed',        -- Payment attempt failed
  'refunded'       -- Payment returned to customer
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM: payment_method
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE payment_method AS ENUM (
  'cash_on_delivery',
  'card',          -- Phase 2: online card payment
  'wallet'         -- Phase 3: in-app wallet balance
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM: notification_type
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE notification_type AS ENUM (
  'order_placed',
  'order_confirmed',
  'order_preparing',
  'order_shipped',
  'order_delivered',
  'order_cancelled',
  'promo',         -- Promotional broadcast
  'system'         -- System-level messages
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM: review_status
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE review_status AS ENUM (
  'pending',       -- Awaiting admin moderation
  'approved',      -- Visible on product page
  'rejected'       -- Hidden after moderation
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUM: inventory_action
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE inventory_action AS ENUM (
  'restock',       -- Admin added stock
  'sale',          -- Stock reduced by order
  'adjustment',    -- Manual correction
  'return'         -- Stock returned from cancelled order
);
```

---

## 2. Table List

| # | Table | Purpose | Soft Delete |
|---|-------|---------|-------------|
| 01 | `profiles` | Extended user info and role | Yes (`deleted_at`) |
| 02 | `categories` | Product taxonomy | Yes (`deleted_at`) |
| 03 | `products` | Product catalog | Yes (`deleted_at`) |
| 04 | `product_images` | Product image gallery | No (hard delete) |
| 05 | `product_inventory` | Stock quantity per product | No |
| 06 | `inventory_logs` | Audit log of all stock movements | No (append-only) |
| 07 | `carts` | One cart per user | No |
| 08 | `cart_items` | Line items in cart | No (hard delete) |
| 09 | `addresses` | Customer saved addresses | Yes (`deleted_at`) |
| 10 | `orders` | Placed orders | No (status = cancelled) |
| 11 | `order_items` | Line items in an order (price snapshot) | No (append-only) |
| 12 | `order_status_history` | Audit trail of status changes | No (append-only) |
| 13 | `payments` | Payment records per order | No |
| 14 | `favorites` | Customer wishlisted products | No (hard delete) |
| 15 | `reviews` | Product ratings and text reviews | Yes (`deleted_at`) |
| 16 | `notifications` | Per-user notification inbox | No |
| 17 | `notification_preferences` | User notification opt-in settings | No |

---

## 3. Table Definitions

### 3.01 — `profiles`

Extends `auth.users` with application-specific fields. One row per authenticated user.

```sql
CREATE TABLE profiles (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id                UUID          PRIMARY KEY
                                  REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ── Identity ────────────────────────────────────────────────────────────
  full_name         TEXT          NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 80),
  phone             TEXT          CHECK (phone ~ '^\+?[0-9\s\-]{7,20}$'),
  avatar_url        TEXT,

  -- ── Role ────────────────────────────────────────────────────────────────
  role              user_role     NOT NULL DEFAULT 'customer',

  -- ── Push Notifications ──────────────────────────────────────────────────
  push_token        TEXT,
  push_enabled      BOOLEAN       NOT NULL DEFAULT TRUE,

  -- ── Account Status ──────────────────────────────────────────────────────
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ                           -- soft delete
);

COMMENT ON TABLE  profiles           IS 'Extended profile data for all authenticated users.';
COMMENT ON COLUMN profiles.role      IS 'customer = regular buyer; admin = platform manager.';
COMMENT ON COLUMN profiles.deleted_at IS 'NULL = active; non-NULL = soft-deleted account.';
```

---

### 3.02 — `categories`

Top-level product groupings. Each product belongs to exactly one category.

```sql
CREATE TABLE categories (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Bilingual Content ───────────────────────────────────────────────────
  name_ar       TEXT          NOT NULL CHECK (char_length(name_ar) BETWEEN 2 AND 100),
  name_en       TEXT          NOT NULL CHECK (char_length(name_en) BETWEEN 2 AND 100),
  slug          TEXT          NOT NULL UNIQUE
                              CHECK (slug ~ '^[a-z0-9\-]+$'),

  -- ── Presentation ────────────────────────────────────────────────────────
  image_url     TEXT,
  sort_order    INTEGER       NOT NULL DEFAULT 0 CHECK (sort_order >= 0),

  -- ── Status ──────────────────────────────────────────────────────────────
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ                           -- soft delete
);

COMMENT ON TABLE  categories           IS 'Product taxonomy. Each product belongs to one category.';
COMMENT ON COLUMN categories.slug      IS 'URL-safe identifier; lowercase letters, digits, hyphens only.';
COMMENT ON COLUMN categories.deleted_at IS 'NULL = active; non-NULL = soft-deleted (products become hidden).';
```

---

### 3.03 — `products`

Core product catalog. Supports bilingual content, pricing, discounts, and availability.

```sql
CREATE TABLE products (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  category_id       UUID          NOT NULL
                                  REFERENCES categories(id) ON DELETE RESTRICT,

  -- ── Bilingual Content ───────────────────────────────────────────────────
  name_ar           TEXT          NOT NULL CHECK (char_length(name_ar) BETWEEN 2 AND 100),
  name_en           TEXT          NOT NULL CHECK (char_length(name_en) BETWEEN 2 AND 100),
  description_ar    TEXT          CHECK (char_length(description_ar) <= 2000),
  description_en    TEXT          CHECK (char_length(description_en) <= 2000),
  slug              TEXT          NOT NULL UNIQUE
                                  CHECK (slug ~ '^[a-z0-9\-]+$'),

  -- ── Pricing ─────────────────────────────────────────────────────────────
  price             NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  discount_pct      NUMERIC(5,2)  NOT NULL DEFAULT 0
                                  CHECK (discount_pct >= 0 AND discount_pct <= 100),
  final_price       NUMERIC(10,2) GENERATED ALWAYS AS
                      (ROUND(price * (1 - discount_pct / 100.0), 2)) STORED,

  -- ── Availability ────────────────────────────────────────────────────────
  is_available      BOOLEAN       NOT NULL DEFAULT TRUE,

  -- ── Presentation ────────────────────────────────────────────────────────
  sort_order        INTEGER       NOT NULL DEFAULT 0 CHECK (sort_order >= 0),

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ                           -- soft delete
);

COMMENT ON TABLE  products              IS 'Product catalog. Supports bilingual content, automatic discount pricing.';
COMMENT ON COLUMN products.price        IS 'Base selling price before discount.';
COMMENT ON COLUMN products.discount_pct IS '0–100 percentage. 0 means no discount.';
COMMENT ON COLUMN products.final_price  IS 'DB-generated: price × (1 − discount_pct/100). Never write directly.';
COMMENT ON COLUMN products.is_available IS 'FALSE hides product from catalog and disables Add to Cart.';
COMMENT ON COLUMN products.deleted_at   IS 'NULL = active; non-NULL = soft-deleted; hidden from all public queries.';
```

---

### 3.04 — `product_images`

Image gallery for each product. The `is_primary` image is used as the thumbnail.

```sql
CREATE TABLE product_images (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  product_id    UUID          NOT NULL
                              REFERENCES products(id) ON DELETE CASCADE,

  -- ── Image ───────────────────────────────────────────────────────────────
  url           TEXT          NOT NULL,
  storage_path  TEXT          NOT NULL,             -- Supabase Storage object path
  is_primary    BOOLEAN       NOT NULL DEFAULT FALSE,
  sort_order    INTEGER       NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  alt_text      TEXT,                               -- Accessibility / SEO

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Only one primary image per product
CREATE UNIQUE INDEX uq_product_primary_image
  ON product_images (product_id)
  WHERE is_primary = TRUE;

COMMENT ON TABLE  product_images              IS 'Image gallery per product. Hard-deleted when removed.';
COMMENT ON COLUMN product_images.storage_path IS 'Path in Supabase Storage bucket; used for deletion.';
COMMENT ON COLUMN product_images.is_primary   IS 'Partial unique index ensures max one primary image per product.';
```

---

### 3.05 — `product_inventory`

Tracks current stock quantity per product. One row per product.

```sql
CREATE TABLE product_inventory (
  -- ── Primary Key / Foreign Key ────────────────────────────────────────────
  product_id      UUID          PRIMARY KEY
                                REFERENCES products(id) ON DELETE CASCADE,

  -- ── Stock ───────────────────────────────────────────────────────────────
  quantity        INTEGER       NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold INTEGER   NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  track_inventory BOOLEAN       NOT NULL DEFAULT TRUE,
  -- When FALSE, stock quantity is ignored (unlimited / not tracked)

  -- ── Audit ───────────────────────────────────────────────────────────────
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  product_inventory                   IS 'Stock level per product. 1:1 with products.';
COMMENT ON COLUMN product_inventory.track_inventory   IS 'FALSE = stock not tracked (e.g., digital/unlimited items).';
COMMENT ON COLUMN product_inventory.low_stock_threshold IS 'Admin alerted when quantity falls below this value (Phase 2).';
```

---

### 3.06 — `inventory_logs`

Append-only audit trail of every stock movement.

```sql
CREATE TABLE inventory_logs (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  product_id      UUID              NOT NULL
                                    REFERENCES products(id) ON DELETE CASCADE,
  order_id        UUID,             -- NULL for restock / adjustment (FK enforced in app layer)
  performed_by    UUID              REFERENCES auth.users(id) ON DELETE SET NULL,

  -- ── Movement ────────────────────────────────────────────────────────────
  action          inventory_action  NOT NULL,
  quantity_change INTEGER           NOT NULL,   -- positive = added, negative = deducted
  quantity_before INTEGER           NOT NULL,
  quantity_after  INTEGER           NOT NULL,
  notes           TEXT,

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  inventory_logs               IS 'Append-only ledger of all stock changes.';
COMMENT ON COLUMN inventory_logs.quantity_change IS 'Positive = stock added; negative = stock removed.';
```

---

### 3.07 — `carts`

One persistent cart per authenticated user.

```sql
CREATE TABLE carts (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  user_id     UUID          NOT NULL UNIQUE
                            REFERENCES auth.users(id) ON DELETE CASCADE,
  -- UNIQUE enforces one cart per user

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE carts IS 'One active cart per authenticated user. Created on first add-to-cart.';
```

---

### 3.08 — `cart_items`

Individual product lines within a cart.

```sql
CREATE TABLE cart_items (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  cart_id       UUID          NOT NULL
                              REFERENCES carts(id) ON DELETE CASCADE,
  product_id    UUID          NOT NULL
                              REFERENCES products(id) ON DELETE CASCADE,

  -- ── Quantity ────────────────────────────────────────────────────────────
  quantity      INTEGER       NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 99),

  -- ── Constraints ─────────────────────────────────────────────────────────
  CONSTRAINT uq_cart_product UNIQUE (cart_id, product_id),
  -- Prevents duplicate product rows; use UPDATE to change quantity instead

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cart_items IS 'Line items in a cart. Duplicate product INSERT should UPDATE quantity instead.';
```

---

### 3.09 — `addresses`

Customer-saved delivery addresses. Multiple addresses per user; one default allowed.

```sql
CREATE TABLE addresses (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  user_id       UUID          NOT NULL
                              REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ── Address Fields ──────────────────────────────────────────────────────
  label         TEXT,                               -- e.g., "Home", "Work"
  full_name     TEXT          NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 80),
  phone         TEXT          NOT NULL CHECK (phone ~ '^\+?[0-9\s\-]{7,20}$'),
  address_line1 TEXT          NOT NULL CHECK (char_length(address_line1) BETWEEN 5 AND 200),
  address_line2 TEXT,
  city          TEXT          NOT NULL CHECK (char_length(city) BETWEEN 2 AND 50),
  state         TEXT,
  postal_code   TEXT,
  country       TEXT          NOT NULL DEFAULT 'SA',
  notes         TEXT          CHECK (char_length(notes) <= 300),

  -- ── Default Flag ────────────────────────────────────────────────────────
  is_default    BOOLEAN       NOT NULL DEFAULT FALSE,

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ                           -- soft delete
);

-- Only one default address per user
CREATE UNIQUE INDEX uq_user_default_address
  ON addresses (user_id)
  WHERE is_default = TRUE AND deleted_at IS NULL;

COMMENT ON TABLE addresses IS 'Customer saved delivery addresses. Soft-deleted, not hard-deleted.';
```

---

### 3.10 — `orders`

Master order record. Created atomically at checkout.

```sql
-- Sequence for human-readable order numbers
CREATE SEQUENCE order_number_seq START 1 INCREMENT 1;

CREATE TABLE orders (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Order Number ────────────────────────────────────────────────────────
  order_number        TEXT            NOT NULL UNIQUE
                                      DEFAULT ('ORD-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0')),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  user_id             UUID            NOT NULL
                                      REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- ── Status ──────────────────────────────────────────────────────────────
  status              order_status    NOT NULL DEFAULT 'pending',

  -- ── Delivery Address Snapshot ───────────────────────────────────────────
  -- Snapshot stored inline (denormalised) so historical orders are immutable
  -- even if the customer later edits or deletes the address.
  delivery_full_name    TEXT          NOT NULL,
  delivery_phone        TEXT          NOT NULL,
  delivery_address_line1 TEXT         NOT NULL,
  delivery_address_line2 TEXT,
  delivery_city         TEXT          NOT NULL,
  delivery_state        TEXT,
  delivery_postal_code  TEXT,
  delivery_country      TEXT          NOT NULL DEFAULT 'SA',
  delivery_notes        TEXT,

  -- ── Financial Totals ────────────────────────────────────────────────────
  subtotal            NUMERIC(10,2)   NOT NULL CHECK (subtotal >= 0),
  discount_total      NUMERIC(10,2)   NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  tax_total           NUMERIC(10,2)   NOT NULL DEFAULT 0 CHECK (tax_total >= 0),
  total               NUMERIC(10,2)   NOT NULL CHECK (total >= 0),

  -- ── Payment ─────────────────────────────────────────────────────────────
  payment_method      payment_method  NOT NULL DEFAULT 'cash_on_delivery',

  -- ── Internal Notes ──────────────────────────────────────────────────────
  internal_notes      TEXT,           -- Admin-visible only

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
  -- No soft delete: cancellation is expressed via status = 'cancelled'
);

COMMENT ON TABLE  orders                          IS 'Master order record. Delivery address is snapshotted inline.';
COMMENT ON COLUMN orders.order_number             IS 'Human-readable reference. Auto-generated from sequence.';
COMMENT ON COLUMN orders.delivery_full_name       IS 'Address snapshot taken at checkout; immutable after creation.';
COMMENT ON COLUMN orders.discount_total           IS 'Sum of all per-item discount savings.';
COMMENT ON COLUMN orders.total                    IS 'subtotal − discount_total + tax_total.';
```

---

### 3.11 — `order_items`

Price-immutable line items. Product details snapshotted at order time.

```sql
CREATE TABLE order_items (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  order_id          UUID          NOT NULL
                                  REFERENCES orders(id) ON DELETE CASCADE,
  product_id        UUID          REFERENCES products(id) ON DELETE SET NULL,
  -- NULL if product is later hard-deleted; snapshot fields preserve history

  -- ── Price Snapshot ──────────────────────────────────────────────────────
  -- These fields capture product data at the moment of order creation.
  -- They are NEVER updated after insertion.
  product_name_ar   TEXT          NOT NULL,
  product_name_en   TEXT          NOT NULL,
  unit_price        NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  discount_pct      NUMERIC(5,2)  NOT NULL DEFAULT 0,
  final_price       NUMERIC(10,2) NOT NULL CHECK (final_price >= 0),
  quantity          INTEGER       NOT NULL CHECK (quantity > 0),
  line_total        NUMERIC(10,2) NOT NULL CHECK (line_total >= 0),
  -- line_total = final_price * quantity (computed at insert time)

  -- ── Image Snapshot ──────────────────────────────────────────────────────
  product_image_url TEXT,         -- Primary image URL at time of order

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  -- No updated_at: order items are immutable after creation
);

COMMENT ON TABLE  order_items             IS 'Immutable line items. All price and name fields are snapshots.';
COMMENT ON COLUMN order_items.product_id  IS 'Nullable FK: product may be deleted later; snapshot fields preserve history.';
COMMENT ON COLUMN order_items.line_total  IS 'final_price × quantity; computed and stored at insert time.';
```

---

### 3.12 — `order_status_history`

Append-only audit log of every status change on an order.

```sql
CREATE TABLE order_status_history (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  order_id      UUID            NOT NULL
                                REFERENCES orders(id) ON DELETE CASCADE,
  changed_by    UUID            REFERENCES auth.users(id) ON DELETE SET NULL,

  -- ── Status Transition ───────────────────────────────────────────────────
  from_status   order_status,   -- NULL for initial 'pending' entry
  to_status     order_status    NOT NULL,
  notes         TEXT,           -- Optional admin note on the change

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  order_status_history         IS 'Append-only audit trail of order status transitions.';
COMMENT ON COLUMN order_status_history.from_status IS 'NULL for the initial status entry when order is first created.';
```

---

### 3.13 — `payments`

One payment record per order. Supports future payment gateway integration.

```sql
CREATE TABLE payments (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  order_id              UUID              NOT NULL UNIQUE
                                          REFERENCES orders(id) ON DELETE CASCADE,
  -- UNIQUE: one payment record per order (multiple attempts tracked in payment_attempts - Phase 2)

  -- ── Payment Detail ──────────────────────────────────────────────────────
  method                payment_method    NOT NULL,
  status                payment_status    NOT NULL DEFAULT 'pending',
  amount                NUMERIC(10,2)     NOT NULL CHECK (amount >= 0),
  currency              TEXT              NOT NULL DEFAULT 'SAR'
                                          CHECK (char_length(currency) = 3),  -- ISO 4217

  -- ── Gateway Fields (Phase 2) ─────────────────────────────────────────────
  gateway_name          TEXT,             -- e.g., 'stripe', 'tap', 'paytabs'
  gateway_transaction_id TEXT,            -- External transaction reference
  gateway_response      JSONB,            -- Full raw gateway response payload

  -- ── Timestamps ──────────────────────────────────────────────────────────
  paid_at               TIMESTAMPTZ,      -- Set when status transitions to 'paid'
  refunded_at           TIMESTAMPTZ,      -- Set when status transitions to 'refunded'

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  payments                      IS 'Payment record per order. Gateway fields used in Phase 2.';
COMMENT ON COLUMN payments.gateway_response     IS 'Raw JSONB payload from payment gateway; never exposed to clients.';
COMMENT ON COLUMN payments.currency             IS 'ISO 4217 3-letter currency code.';
```

---

### 3.14 — `favorites`

Customer wishlisted products.

```sql
CREATE TABLE favorites (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  user_id       UUID          NOT NULL
                              REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id    UUID          NOT NULL
                              REFERENCES products(id) ON DELETE CASCADE,

  -- ── Constraints ─────────────────────────────────────────────────────────
  CONSTRAINT uq_user_favorite_product UNIQUE (user_id, product_id),

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  -- No updated_at: favorites are either present or absent (toggle)
);

COMMENT ON TABLE favorites IS 'Customer product wishlist. Unique constraint prevents duplicates.';
```

---

### 3.15 — `reviews`

Customer product ratings and text reviews with moderation workflow.

```sql
CREATE TABLE reviews (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  product_id      UUID            NOT NULL
                                  REFERENCES products(id) ON DELETE CASCADE,
  user_id         UUID            NOT NULL
                                  REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id        UUID            REFERENCES orders(id) ON DELETE SET NULL,
  -- order_id can be used to verify the reviewer actually purchased the product

  -- ── Review Content ──────────────────────────────────────────────────────
  rating          SMALLINT        NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT            CHECK (char_length(title) <= 100),
  body            TEXT            CHECK (char_length(body) <= 1000),

  -- ── Moderation ──────────────────────────────────────────────────────────
  status          review_status   NOT NULL DEFAULT 'pending',
  moderated_by    UUID            REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at    TIMESTAMPTZ,

  -- ── Constraints ─────────────────────────────────────────────────────────
  CONSTRAINT uq_user_product_review UNIQUE (user_id, product_id),
  -- One review per customer per product

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ                             -- soft delete
);

COMMENT ON TABLE  reviews          IS 'Product reviews with admin moderation. One review per user per product.';
COMMENT ON COLUMN reviews.order_id IS 'Optional: used to verify purchase before allowing review (Phase 2 enforcement).';
COMMENT ON COLUMN reviews.status   IS 'pending = hidden; approved = visible on product; rejected = permanently hidden.';
```

---

### 3.16 — `notifications`

In-app notification inbox per user.

```sql
CREATE TABLE notifications (
  -- ── Primary Key ─────────────────────────────────────────────────────────
  id            UUID                PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Foreign Keys ────────────────────────────────────────────────────────
  user_id       UUID                NOT NULL
                                    REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id      UUID                REFERENCES orders(id) ON DELETE SET NULL,

  -- ── Content ─────────────────────────────────────────────────────────────
  type          notification_type   NOT NULL,
  title_ar      TEXT                NOT NULL,
  title_en      TEXT                NOT NULL,
  body_ar       TEXT,
  body_en       TEXT,
  data          JSONB,              -- Arbitrary metadata (e.g., { "screen": "orders", "id": "..." })

  -- ── Read State ──────────────────────────────────────────────────────────
  is_read       BOOLEAN             NOT NULL DEFAULT FALSE,
  read_at       TIMESTAMPTZ,

  -- ── Audit ───────────────────────────────────────────────────────────────
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  notifications      IS 'In-app notification inbox. Supports order and promo notifications.';
COMMENT ON COLUMN notifications.data IS 'JSONB payload for deep-link routing (e.g., which order to open).';
```

---

### 3.17 — `notification_preferences`

Per-user notification opt-in settings.

```sql
CREATE TABLE notification_preferences (
  -- ── Primary Key / Foreign Key ────────────────────────────────────────────
  user_id               UUID          PRIMARY KEY
                                      REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ── Channel Preferences ─────────────────────────────────────────────────
  push_order_updates    BOOLEAN       NOT NULL DEFAULT TRUE,
  push_promotions       BOOLEAN       NOT NULL DEFAULT TRUE,
  email_order_updates   BOOLEAN       NOT NULL DEFAULT TRUE,
  email_promotions      BOOLEAN       NOT NULL DEFAULT FALSE,

  -- ── Audit ───────────────────────────────────────────────────────────────
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notification_preferences IS 'Per-user notification channel opt-in settings. 1:1 with profiles.';
```

---

## 4. Indexes

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_role         ON profiles (role);
CREATE INDEX idx_profiles_is_active    ON profiles (is_active) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- categories
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_categories_active     ON categories (is_active, sort_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_slug       ON categories (slug);   -- unique, already indexed

-- ─────────────────────────────────────────────────────────────────────────────
-- products
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_products_category          ON products (category_id);
CREATE INDEX idx_products_available         ON products (is_available) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_category_available ON products (category_id, is_available) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_slug              ON products (slug);
CREATE INDEX idx_products_final_price       ON products (final_price);
-- Full-text search on bilingual product names
CREATE INDEX idx_products_fts_ar ON products USING gin (to_tsvector('arabic',  name_ar));
CREATE INDEX idx_products_fts_en ON products USING gin (to_tsvector('english', name_en));

-- ─────────────────────────────────────────────────────────────────────────────
-- product_images
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_product_images_product   ON product_images (product_id, sort_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- product_inventory
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_inventory_low_stock
  ON product_inventory (quantity, low_stock_threshold)
  WHERE track_inventory = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- inventory_logs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_inventory_logs_product   ON inventory_logs (product_id, created_at DESC);
CREATE INDEX idx_inventory_logs_order     ON inventory_logs (order_id) WHERE order_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- carts / cart_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_carts_user              ON carts (user_id);          -- UNIQUE already indexed
CREATE INDEX idx_cart_items_cart         ON cart_items (cart_id);
CREATE INDEX idx_cart_items_product      ON cart_items (product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- addresses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_addresses_user          ON addresses (user_id) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- orders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_orders_user             ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status           ON orders (status);
CREATE INDEX idx_orders_created          ON orders (created_at DESC);
CREATE INDEX idx_orders_user_status      ON orders (user_id, status);

-- ─────────────────────────────────────────────────────────────────────────────
-- order_items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_order_items_order       ON order_items (order_id);
CREATE INDEX idx_order_items_product     ON order_items (product_id) WHERE product_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- order_status_history
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_order_status_history_order ON order_status_history (order_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- payments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_payments_order          ON payments (order_id);       -- UNIQUE already indexed
CREATE INDEX idx_payments_status         ON payments (status);
CREATE INDEX idx_payments_gateway_txn    ON payments (gateway_transaction_id)
  WHERE gateway_transaction_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- favorites
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_favorites_user          ON favorites (user_id);
CREATE INDEX idx_favorites_product       ON favorites (product_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- reviews
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_reviews_product         ON reviews (product_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_user            ON reviews (user_id)            WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- notifications
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_notifications_user      ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread    ON notifications (user_id, is_read)
  WHERE is_read = FALSE;
```

---

## 5. Triggers and Functions

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: set_updated_at()
-- Keeps updated_at in sync on every row update.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to every table that has updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','categories','products','carts','cart_items',
    'addresses','orders','payments','reviews','notification_preferences'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_set_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t
    );
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: handle_new_user()
-- Auto-creates a profiles row after Supabase Auth signup.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: handle_new_user_preferences()
-- Auto-creates notification preferences when a profile is created.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: ensure_single_default_address()
-- Clears other default addresses when a new default is set.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE addresses
    SET    is_default = FALSE
    WHERE  user_id      = NEW.user_id
      AND  id          != NEW.id
      AND  deleted_at  IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_single_default_address
  AFTER INSERT OR UPDATE OF is_default ON addresses
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION ensure_single_default_address();

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: log_order_status_change()
-- Appends a row to order_status_history on every orders.status update.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_order_status
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: place_order(payload JSONB)
-- Atomic order placement: validate cart → insert order + items + payment →
-- deduct inventory → clear cart. Rolls back entirely on any failure.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION place_order(payload JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id         UUID := auth.uid();
  v_cart_id         UUID;
  v_order_id        UUID := gen_random_uuid();
  v_order_number    TEXT;
  v_subtotal        NUMERIC(10,2) := 0;
  v_discount_total  NUMERIC(10,2) := 0;
  v_total           NUMERIC(10,2) := 0;
  v_item            RECORD;
BEGIN
  -- 1. Get cart
  SELECT id INTO v_cart_id FROM carts WHERE user_id = v_user_id;
  IF v_cart_id IS NULL THEN
    RAISE EXCEPTION 'CART_NOT_FOUND';
  END IF;

  -- 2. Validate cart is not empty
  IF NOT EXISTS (SELECT 1 FROM cart_items WHERE cart_id = v_cart_id) THEN
    RAISE EXCEPTION 'CART_EMPTY';
  END IF;

  -- 3. Validate all items are available
  IF EXISTS (
    SELECT 1 FROM cart_items ci
    JOIN   products p ON p.id = ci.product_id
    WHERE  ci.cart_id     = v_cart_id
      AND  (p.is_available = FALSE OR p.deleted_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'UNAVAILABLE_ITEMS';
  END IF;

  -- 4. Compute totals from current product prices (server-side; ignores client total)
  FOR v_item IN
    SELECT ci.quantity,
           p.name_ar, p.name_en,
           p.price       AS unit_price,
           p.discount_pct,
           p.final_price,
           pi.url        AS image_url,
           p.id          AS product_id
    FROM   cart_items ci
    JOIN   products p        ON p.id = ci.product_id
    LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
    WHERE  ci.cart_id = v_cart_id
  LOOP
    v_subtotal       := v_subtotal       + (v_item.unit_price  * v_item.quantity);
    v_discount_total := v_discount_total + ((v_item.unit_price - v_item.final_price) * v_item.quantity);
  END LOOP;

  v_total := v_subtotal - v_discount_total;

  -- 5. Insert order
  INSERT INTO orders (
    id, user_id, status,
    delivery_full_name, delivery_phone,
    delivery_address_line1, delivery_address_line2,
    delivery_city, delivery_state, delivery_postal_code, delivery_country,
    delivery_notes,
    subtotal, discount_total, tax_total, total,
    payment_method
  ) VALUES (
    v_order_id, v_user_id, 'pending',
    payload->>'full_name',      payload->>'phone',
    payload->>'address_line1',  payload->>'address_line2',
    payload->>'city',           payload->>'state',
    payload->>'postal_code',    COALESCE(payload->>'country', 'SA'),
    payload->>'notes',
    v_subtotal, v_discount_total, 0, v_total,
    COALESCE((payload->>'payment_method')::payment_method, 'cash_on_delivery')
  )
  RETURNING order_number INTO v_order_number;

  -- 6. Insert order items
  INSERT INTO order_items (
    order_id, product_id,
    product_name_ar, product_name_en,
    unit_price, discount_pct, final_price,
    quantity, line_total, product_image_url
  )
  SELECT
    v_order_id, ci.product_id,
    p.name_ar, p.name_en,
    p.price, p.discount_pct, p.final_price,
    ci.quantity, (p.final_price * ci.quantity),
    (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = TRUE LIMIT 1)
  FROM cart_items ci
  JOIN products p ON p.id = ci.product_id
  WHERE ci.cart_id = v_cart_id;

  -- 7. Insert initial status history
  INSERT INTO order_status_history (order_id, from_status, to_status)
  VALUES (v_order_id, NULL, 'pending');

  -- 8. Create payment record
  INSERT INTO payments (order_id, method, status, amount, currency)
  VALUES (
    v_order_id,
    COALESCE((payload->>'payment_method')::payment_method, 'cash_on_delivery'),
    'pending',
    v_total,
    'SAR'
  );

  -- 9. Deduct inventory (only for tracked products)
  UPDATE product_inventory pi_tbl
  SET    quantity = pi_tbl.quantity - ci.quantity
  FROM   cart_items ci
  JOIN   product_inventory inv ON inv.product_id = ci.product_id AND inv.track_inventory = TRUE
  WHERE  pi_tbl.product_id = ci.product_id
    AND  ci.cart_id = v_cart_id;

  -- 10. Clear cart
  DELETE FROM cart_items WHERE cart_id = v_cart_id;

  RETURN jsonb_build_object(
    'order_id',     v_order_id,
    'order_number', v_order_number,
    'total',        v_total
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: get_product_catalog(p_category_id UUID, p_search TEXT, p_limit INT, p_offset INT)
-- Returns active, non-deleted products with primary image and category.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_product_catalog(
  p_category_id UUID    DEFAULT NULL,
  p_search      TEXT    DEFAULT NULL,
  p_limit       INTEGER DEFAULT 20,
  p_offset      INTEGER DEFAULT 0
)
RETURNS TABLE (
  id            UUID,
  name_ar       TEXT,
  name_en       TEXT,
  slug          TEXT,
  price         NUMERIC,
  discount_pct  NUMERIC,
  final_price   NUMERIC,
  is_available  BOOLEAN,
  category_id   UUID,
  category_name_ar TEXT,
  category_name_en TEXT,
  primary_image_url TEXT,
  total_count   BIGINT
)
LANGUAGE sql STABLE AS $$
  SELECT
    p.id, p.name_ar, p.name_en, p.slug,
    p.price, p.discount_pct, p.final_price,
    p.is_available,
    c.id, c.name_ar, c.name_en,
    (SELECT pi.url FROM product_images pi
     WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1),
    COUNT(*) OVER () AS total_count
  FROM   products p
  JOIN   categories c ON c.id = p.category_id
  WHERE  p.deleted_at    IS NULL
    AND  p.is_available  = TRUE
    AND  c.is_active     = TRUE
    AND  c.deleted_at    IS NULL
    AND  (p_category_id IS NULL OR p.category_id = p_category_id)
    AND  (p_search IS NULL OR (
          to_tsvector('arabic',  p.name_ar) @@ plainto_tsquery('arabic',  p_search)
       OR to_tsvector('english', p.name_en) @@ plainto_tsquery('english', p_search)
    ))
  ORDER BY p.sort_order, p.created_at DESC
  LIMIT  p_limit
  OFFSET p_offset;
$$;
```

---

## 6. Row-Level Security Policies

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Helper function: is_admin()
-- Used in RLS policies to check the current user's role.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id   = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
  );
$$;

-- ═════════════════════════════════════════════════════════════════════════════
-- PROFILES
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    -- Prevents self-elevation: role cannot be changed through this policy
  );

CREATE POLICY "profiles_update_admin"
  ON profiles FOR ALL
  USING (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- CATEGORIES
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_public"
  ON categories FOR SELECT
  USING (is_active = TRUE AND deleted_at IS NULL);

CREATE POLICY "categories_all_admin"
  ON categories FOR ALL
  USING (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- PRODUCTS
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_public"
  ON products FOR SELECT
  USING (is_available = TRUE AND deleted_at IS NULL);

CREATE POLICY "products_all_admin"
  ON products FOR ALL
  USING (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- PRODUCT_IMAGES
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_images_select_public"
  ON product_images FOR SELECT
  USING (TRUE);

CREATE POLICY "product_images_all_admin"
  ON product_images FOR ALL
  USING (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- PRODUCT_INVENTORY
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE product_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_select_public"
  ON product_inventory FOR SELECT
  USING (TRUE); -- quantity visibility is intentional (show in-stock/out-of-stock)

CREATE POLICY "inventory_all_admin"
  ON product_inventory FOR ALL
  USING (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- INVENTORY_LOGS
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_logs_admin_only"
  ON inventory_logs FOR ALL
  USING (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- CARTS
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carts_own_user"
  ON carts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- CART_ITEMS
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart_items_own_user"
  ON cart_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM carts WHERE id = cart_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM carts WHERE id = cart_id AND user_id = auth.uid())
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- ADDRESSES
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses_own_user"
  ON addresses FOR ALL
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_read_admin"
  ON addresses FOR SELECT
  USING (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- ORDERS
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "orders_insert_own"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_all_admin"
  ON orders FOR ALL
  USING (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- ORDER_ITEMS
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_own"
  ON order_items FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "order_items_insert_own"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "order_items_all_admin"
  ON order_items FOR ALL
  USING (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- ORDER_STATUS_HISTORY
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_status_history_select_own"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "order_status_history_all_admin"
  ON order_status_history FOR ALL
  USING (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- PAYMENTS
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_own"
  ON payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM orders WHERE id = order_id AND user_id = auth.uid())
  );

CREATE POLICY "payments_all_admin"
  ON payments FOR ALL
  USING (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- FAVORITES
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_own_user"
  ON favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- REVIEWS
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select_approved_public"
  ON reviews FOR SELECT
  USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "reviews_select_own"
  ON reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "reviews_insert_own"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_update_own"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');
  -- Customers can only edit their own unmoderated reviews

CREATE POLICY "reviews_all_admin"
  ON reviews FOR ALL
  USING (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_own_user"
  ON notifications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_insert_admin"
  ON notifications FOR INSERT
  WITH CHECK (is_admin());

-- ═════════════════════════════════════════════════════════════════════════════
-- NOTIFICATION_PREFERENCES
-- ═════════════════════════════════════════════════════════════════════════════
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_own_user"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## 7. Soft Delete Strategy

| Table | Strategy | Rationale |
|-------|----------|-----------|
| `profiles` | `deleted_at` timestamp | Account deactivation with data retention for legal compliance |
| `categories` | `deleted_at` timestamp | Preserves category reference on historical order items |
| `products` | `deleted_at` timestamp | Required: `order_items` may reference deleted products |
| `addresses` | `deleted_at` timestamp | Preserves delivery history on orders; RLS filters by `deleted_at IS NULL` |
| `reviews` | `deleted_at` timestamp | Moderated content may need to be hidden but retained for audit |
| `orders` | Status = `'cancelled'` | Orders have lifecycle; their history must remain read-accessible |
| `cart_items` | Hard delete | Short-lived; no historical value |
| `favorites` | Hard delete | Toggle action; no historical tracking needed |
| `product_images` | Hard delete | Image replaced/removed intentionally; no historical value |
| `inventory_logs` | Append-only, no delete | Audit ledger; must be immutable |
| `order_items` | Append-only, no delete | Immutable financial record |
| `order_status_history` | Append-only, no delete | Compliance audit trail |

### Soft Delete Query Pattern

All public queries should include the soft-delete filter:

```sql
-- Always add to queries involving soft-delete tables:
WHERE deleted_at IS NULL

-- Example: List active products in a category
SELECT * FROM products
WHERE  category_id  = $1
  AND  is_available = TRUE
  AND  deleted_at   IS NULL;
```

---

## 8. Relationships Summary

```
auth.users (Supabase-managed)
│
├── 1:1  profiles           (id → auth.users.id)
│         │
│         └── 1:1  notification_preferences  (user_id → auth.users.id)
│
├── 1:1  carts              (user_id → auth.users.id)
│         └── 1:N  cart_items  (cart_id → carts.id)
│                               └── N:1  products
│
├── 1:N  addresses          (user_id → auth.users.id)
│
├── 1:N  orders             (user_id → auth.users.id)
│         ├── 1:N  order_items             (order_id → orders.id)
│         │         └── N:1  products      (product_id → products.id, nullable)
│         ├── 1:N  order_status_history    (order_id → orders.id)
│         └── 1:1  payments               (order_id → orders.id)
│
├── 1:N  favorites          (user_id → auth.users.id)
│         └── N:1  products
│
├── 1:N  reviews            (user_id → auth.users.id)
│         └── N:1  products
│
└── 1:N  notifications      (user_id → auth.users.id)

categories (independent)
└── 1:N  products           (category_id → categories.id)
          ├── 1:N  product_images     (product_id → products.id)
          ├── 1:1  product_inventory  (product_id → products.id)
          └── 1:N  inventory_logs     (product_id → products.id)
```

---

## 9. DBML Schema

> Compatible with [dbdiagram.io](https://dbdiagram.io) for visual ERD generation.

```dbml
// ArdAlsharq Database Schema
// Version: 1.0 | Date: 2026-03-12

// ─── ENUMS ───────────────────────────────────────────────────────────────────

enum user_role {
  customer
  admin
}

enum order_status {
  pending
  confirmed
  preparing
  shipped
  delivered
  cancelled
}

enum payment_status {
  pending
  paid
  failed
  refunded
}

enum payment_method {
  cash_on_delivery
  card
  wallet
}

enum notification_type {
  order_placed
  order_confirmed
  order_preparing
  order_shipped
  order_delivered
  order_cancelled
  promo
  system
}

enum review_status {
  pending
  approved
  rejected
}

enum inventory_action {
  restock
  sale
  adjustment
  return
}

// ─── TABLES ──────────────────────────────────────────────────────────────────

Table profiles {
  id            uuid        [pk, note: "References auth.users(id)"]
  full_name     text        [not null]
  phone         text
  avatar_url    text
  role          user_role   [not null, default: "customer"]
  push_token    text
  push_enabled  boolean     [not null, default: true]
  is_active     boolean     [not null, default: true]
  created_at    timestamptz [not null, default: "now()"]
  updated_at    timestamptz [not null, default: "now()"]
  deleted_at    timestamptz

  note: "Extended user profile. 1:1 with auth.users."
}

Table categories {
  id          uuid    [pk, default: "gen_random_uuid()"]
  name_ar     text    [not null]
  name_en     text    [not null]
  slug        text    [not null, unique]
  image_url   text
  sort_order  integer [not null, default: 0]
  is_active   boolean [not null, default: true]
  created_at  timestamptz [not null, default: "now()"]
  updated_at  timestamptz [not null, default: "now()"]
  deleted_at  timestamptz
}

Table products {
  id              uuid          [pk, default: "gen_random_uuid()"]
  category_id     uuid          [not null, ref: > categories.id]
  name_ar         text          [not null]
  name_en         text          [not null]
  description_ar  text
  description_en  text
  slug            text          [not null, unique]
  price           numeric(10,2) [not null]
  discount_pct    numeric(5,2)  [not null, default: 0]
  final_price     numeric(10,2) [not null, note: "Generated: price*(1-discount_pct/100)"]
  is_available    boolean       [not null, default: true]
  sort_order      integer       [not null, default: 0]
  created_at      timestamptz   [not null, default: "now()"]
  updated_at      timestamptz   [not null, default: "now()"]
  deleted_at      timestamptz
}

Table product_images {
  id            uuid        [pk, default: "gen_random_uuid()"]
  product_id    uuid        [not null, ref: > products.id]
  url           text        [not null]
  storage_path  text        [not null]
  is_primary    boolean     [not null, default: false]
  sort_order    integer     [not null, default: 0]
  alt_text      text
  created_at    timestamptz [not null, default: "now()"]

  note: "Max one primary image per product enforced via partial unique index."
}

Table product_inventory {
  product_id           uuid    [pk, ref: - products.id]
  quantity             integer [not null, default: 0]
  low_stock_threshold  integer [not null, default: 5]
  track_inventory      boolean [not null, default: true]
  updated_at           timestamptz [not null, default: "now()"]
}

Table inventory_logs {
  id              uuid              [pk, default: "gen_random_uuid()"]
  product_id      uuid              [not null, ref: > products.id]
  order_id        uuid
  performed_by    uuid
  action          inventory_action  [not null]
  quantity_change integer           [not null]
  quantity_before integer           [not null]
  quantity_after  integer           [not null]
  notes           text
  created_at      timestamptz       [not null, default: "now()"]
}

Table carts {
  id          uuid        [pk, default: "gen_random_uuid()"]
  user_id     uuid        [not null, unique, ref: - profiles.id]
  created_at  timestamptz [not null, default: "now()"]
  updated_at  timestamptz [not null, default: "now()"]
}

Table cart_items {
  id          uuid        [pk, default: "gen_random_uuid()"]
  cart_id     uuid        [not null, ref: > carts.id]
  product_id  uuid        [not null, ref: > products.id]
  quantity    integer     [not null, default: 1]
  created_at  timestamptz [not null, default: "now()"]
  updated_at  timestamptz [not null, default: "now()"]

  indexes {
    (cart_id, product_id) [unique]
  }
}

Table addresses {
  id              uuid        [pk, default: "gen_random_uuid()"]
  user_id         uuid        [not null, ref: > profiles.id]
  label           text
  full_name       text        [not null]
  phone           text        [not null]
  address_line1   text        [not null]
  address_line2   text
  city            text        [not null]
  state           text
  postal_code     text
  country         text        [not null, default: "SA"]
  notes           text
  is_default      boolean     [not null, default: false]
  created_at      timestamptz [not null, default: "now()"]
  updated_at      timestamptz [not null, default: "now()"]
  deleted_at      timestamptz
}

Table orders {
  id                      uuid            [pk, default: "gen_random_uuid()"]
  order_number            text            [not null, unique]
  user_id                 uuid            [not null, ref: > profiles.id]
  status                  order_status    [not null, default: "pending"]
  delivery_full_name      text            [not null]
  delivery_phone          text            [not null]
  delivery_address_line1  text            [not null]
  delivery_address_line2  text
  delivery_city           text            [not null]
  delivery_state          text
  delivery_postal_code    text
  delivery_country        text            [not null, default: "SA"]
  delivery_notes          text
  subtotal                numeric(10,2)   [not null]
  discount_total          numeric(10,2)   [not null, default: 0]
  tax_total               numeric(10,2)   [not null, default: 0]
  total                   numeric(10,2)   [not null]
  payment_method          payment_method  [not null, default: "cash_on_delivery"]
  internal_notes          text
  created_at              timestamptz     [not null, default: "now()"]
  updated_at              timestamptz     [not null, default: "now()"]
}

Table order_items {
  id                uuid            [pk, default: "gen_random_uuid()"]
  order_id          uuid            [not null, ref: > orders.id]
  product_id        uuid            [ref: > products.id, note: "Nullable: product may be deleted"]
  product_name_ar   text            [not null]
  product_name_en   text            [not null]
  unit_price        numeric(10,2)   [not null]
  discount_pct      numeric(5,2)    [not null, default: 0]
  final_price       numeric(10,2)   [not null]
  quantity          integer         [not null]
  line_total        numeric(10,2)   [not null]
  product_image_url text
  created_at        timestamptz     [not null, default: "now()"]
}

Table order_status_history {
  id           uuid         [pk, default: "gen_random_uuid()"]
  order_id     uuid         [not null, ref: > orders.id]
  changed_by   uuid
  from_status  order_status
  to_status    order_status [not null]
  notes        text
  created_at   timestamptz  [not null, default: "now()"]
}

Table payments {
  id                     uuid            [pk, default: "gen_random_uuid()"]
  order_id               uuid            [not null, unique, ref: - orders.id]
  method                 payment_method  [not null]
  status                 payment_status  [not null, default: "pending"]
  amount                 numeric(10,2)   [not null]
  currency               text            [not null, default: "SAR"]
  gateway_name           text
  gateway_transaction_id text
  gateway_response       jsonb
  paid_at                timestamptz
  refunded_at            timestamptz
  created_at             timestamptz     [not null, default: "now()"]
  updated_at             timestamptz     [not null, default: "now()"]
}

Table favorites {
  id          uuid        [pk, default: "gen_random_uuid()"]
  user_id     uuid        [not null, ref: > profiles.id]
  product_id  uuid        [not null, ref: > products.id]
  created_at  timestamptz [not null, default: "now()"]

  indexes {
    (user_id, product_id) [unique]
  }
}

Table reviews {
  id            uuid          [pk, default: "gen_random_uuid()"]
  product_id    uuid          [not null, ref: > products.id]
  user_id       uuid          [not null, ref: > profiles.id]
  order_id      uuid          [ref: > orders.id]
  rating        smallint      [not null, note: "1–5"]
  title         text
  body          text
  status        review_status [not null, default: "pending"]
  moderated_by  uuid
  moderated_at  timestamptz
  created_at    timestamptz   [not null, default: "now()"]
  updated_at    timestamptz   [not null, default: "now()"]
  deleted_at    timestamptz

  indexes {
    (user_id, product_id) [unique]
  }
}

Table notifications {
  id          uuid              [pk, default: "gen_random_uuid()"]
  user_id     uuid              [not null, ref: > profiles.id]
  order_id    uuid              [ref: > orders.id]
  type        notification_type [not null]
  title_ar    text              [not null]
  title_en    text              [not null]
  body_ar     text
  body_en     text
  data        jsonb
  is_read     boolean           [not null, default: false]
  read_at     timestamptz
  created_at  timestamptz       [not null, default: "now()"]
}

Table notification_preferences {
  user_id               uuid    [pk, ref: - profiles.id]
  push_order_updates    boolean [not null, default: true]
  push_promotions       boolean [not null, default: true]
  email_order_updates   boolean [not null, default: true]
  email_promotions      boolean [not null, default: false]
  updated_at            timestamptz [not null, default: "now()"]
}
```

---

## 10. Migration Execution Order

Run migrations in this exact sequence to satisfy all foreign key dependencies:

```
001_create_enums.sql
002_create_profiles.sql
003_create_categories.sql
004_create_products.sql
005_create_product_images.sql
006_create_product_inventory.sql
007_create_inventory_logs.sql
008_create_carts.sql
009_create_cart_items.sql
010_create_addresses.sql
011_create_orders.sql
012_create_order_items.sql
013_create_order_status_history.sql
014_create_payments.sql
015_create_favorites.sql
016_create_reviews.sql
017_create_notifications.sql
018_create_notification_preferences.sql
019_create_indexes.sql
020_create_functions_and_triggers.sql
021_enable_rls.sql
022_create_rls_policies.sql
023_seed_dev_data.sql       ← Dev/staging only
```

---

## 11. Extensibility Notes

### Near-Term (Phase 2)

| Feature | Schema Change Required |
|---------|----------------------|
| Payment gateway | `payments.gateway_name`, `gateway_transaction_id`, `gateway_response` already present — no migration needed |
| Push notifications | `profiles.push_token` already present — add Edge Function trigger on `orders.status` change |
| Saved addresses at checkout | `addresses` table already in place — update checkout UI to offer address selection |
| Verified purchase reviews | `reviews.order_id` FK already present — add DB constraint enforcing purchase verification |
| Social login (Google, Apple) | Supabase Auth configuration only — no DB schema changes needed |

### Medium-Term (Phase 3)

| Feature | Schema Addition |
|---------|----------------|
| Promo codes / coupons | New table: `coupons (id, code, type, value, min_order, uses_limit, uses_count, valid_from, valid_until)` |
| Loyalty points | New table: `loyalty_points (id, user_id, order_id, action, points, balance_after)` |
| Product variants | New tables: `product_variants`, `variant_options` with FK to `products`; update `cart_items` and `order_items` |
| Multi-currency | Add `currency` field to `products`; exchange rate table for conversion |
| Scheduled discounts | Add `discount_starts_at`, `discount_ends_at` to `products`; cron job to toggle discount |
| In-app wallet | New table: `wallet_transactions (id, user_id, type, amount, balance_after, reference_id)` |

### Long-Term (Phase 4+)

| Feature | Schema Addition |
|---------|----------------|
| Multi-vendor marketplace | Add `vendors` table; add `vendor_id` FK to `products` and `orders` |
| Delivery tracking | New tables: `delivery_zones`, `delivery_slots`, `shipments` |
| Advanced inventory | `warehouses`, `product_warehouse_inventory` for multi-location stock |
| Subscription orders | `subscription_plans`, `user_subscriptions`, `subscription_orders` |
| Granular admin roles | `admin_roles`, `admin_permissions`, `admin_role_assignments` tables |

### Architecture Notes

- **`final_price` as a generated column** eliminates all risk of price calculation drift across services. Never compute `final_price` in application code.
- **`order_items` price snapshot** ensures historical orders always reflect what was charged, regardless of future product price changes.
- **`orders` delivery address snapshot** (inline denormalization) ensures a customer deleting their saved address never corrupts historical order records.
- **`inventory_logs` as append-only** provides a complete stock movement ledger that can reconstruct `product_inventory.quantity` at any point in time.
- **`is_admin()` helper function** centralizes the admin check in RLS policies — updating to support multi-role in Phase 4 requires changing this one function only.
- **JSONB `data` in notifications** provides forward compatibility for deep-link routing without schema changes.
- **`gateway_response JSONB` in payments** stores the full raw gateway payload, enabling debugging and refund processing without loss of information.

---

*Document Status: **FINAL** — Ready for migration file creation.*  
*Next Step: Convert each section into numbered SQL migration files under `supabase/migrations/`.*
