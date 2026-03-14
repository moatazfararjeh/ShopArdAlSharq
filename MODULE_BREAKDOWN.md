# ArdAlsharq — Detailed Module Breakdown

> **Version:** 1.0  
> **Date:** March 12, 2026  
> **Reference:** PROJECT_PLANNING.md v1.0  
> **Status:** Approved Baseline

---

## Table of Contents

| # | Module | Priority |
|---|--------|----------|
| 01 | [Authentication](#module-01--authentication) | High |
| 02 | [Categories](#module-02--categories) | High |
| 03 | [Products](#module-03--products) | High |
| 04 | [Pricing and Discounts](#module-04--pricing-and-discounts) | High |
| 05 | [Cart](#module-05--cart) | High |
| 06 | [Checkout](#module-06--checkout) | High |
| 07 | [Orders](#module-07--orders) | High |
| 08 | [My Orders](#module-08--my-orders) | High |
| 09 | [Admin Product Management](#module-09--admin-product-management) | High |
| 10 | [Admin Category Management](#module-10--admin-category-management) | High |
| 11 | [User Profile](#module-11--user-profile) | Medium |
| 12 | [Addresses](#module-12--addresses) | Medium |
| 13 | [Notifications](#module-13--notifications) | Medium |
| 14 | [Reports](#module-14--reports-future-phase) | Low |

---

## Module 01 — Authentication

| Attribute | Detail |
|-----------|--------|
| **Module Name** | Authentication |
| **Module Code** | MOD-AUTH |
| **Purpose** | Manage user identity, session lifecycle, and access control. Provides secure registration, login, logout, and password recovery for all users. Determines user role (customer vs. admin) and gates access to protected routes across the application. |

### Main Features

| # | Feature | Description |
|---|---------|-------------|
| F-01 | User Registration | New users create an account with full name, email, and password. A `profiles` row is auto-created via DB trigger. |
| F-02 | User Login | Authenticate with email and password via Supabase Auth; receive and persist JWT session. |
| F-03 | Session Persistence | JWT session stored in `AsyncStorage` (mobile) and `localStorage` (web); auto-refreshed by Supabase client. |
| F-04 | Logout | Clears local session and Supabase server session; redirects to public home. |
| F-05 | Password Reset | Trigger password-reset email via Supabase Auth; user follows link to set a new password. |
| F-06 | Role Detection | After login, fetch `profiles.role` to determine if user is `customer` or `admin`. Store in global auth state. |
| F-07 | Route Guard — Customer | Redirect unauthenticated users attempting to access protected customer routes to `/login`. |
| F-08 | Route Guard — Admin | Redirect non-admin users attempting to access admin routes to home. |
| F-09 | Guest Access | Users may browse all public screens without authentication. Login is prompted only when a protected action is attempted (e.g., Add to Cart). |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | Can register and log in; cannot access protected routes |
| Customer | Full access to customer-protected routes after login |
| Admin | Full access to admin routes after login + role verification |

### Screens Included

| Screen | Route | Description |
|--------|-------|-------------|
| Login | `/login` | Email + password form with error feedback and forgot-password link |
| Register | `/register` | Full name, email, password, confirm password form |
| Forgot Password | `/forgot-password` | Email input to trigger password reset email |
| Reset Password | `/reset-password` | New password + confirm (reached via email link) |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `auth.users` | INSERT, SELECT | Managed by Supabase Auth internally |
| `profiles` | INSERT (trigger), SELECT, UPDATE | Row created automatically on `auth.users` insert |

### Validation Rules

| Field | Rule |
|-------|------|
| Full Name | Required · 2–80 characters · letters and spaces only |
| Email | Required · valid RFC 5322 format · must be unique in `auth.users` |
| Password (register) | Required · min 8 characters · at least 1 letter and 1 digit |
| Confirm Password | Required · must exactly match the Password field |
| Password (reset) | Same rules as register password |
| Login email | Required · valid email format |
| Login password | Required · non-empty |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| Supabase Auth | External Service | Email/password provider; JWT issuer |
| `profiles` table | Database | Must exist with trigger before auth flows can complete |
| Zustand `authStore` | Internal State | Holds session and profile; consumed by all auth-guarded screens |
| Expo Router route guards | Internal Navigation | `(customer)/_layout.tsx` and `(admin)/_layout.tsx` both depend on auth state |
| `AsyncStorage` | Device Storage | Required for mobile session persistence |

### Priority

> **HIGH** — Foundational module. Every protected module depends on it. Must be completed in Sprint 1.

---

## Module 02 — Categories

| Attribute | Detail |
|-----------|--------|
| **Module Name** | Categories |
| **Module Code** | MOD-CAT |
| **Purpose** | Organizes the product catalog into logical groupings, enabling customers to navigate and filter products efficiently. Provides admins with full lifecycle management of categories. |

### Main Features

| # | Feature | Description |
|---|---------|-------------|
| F-01 | Public Category Listing | Display all active categories with name and image in a browsable grid/list. |
| F-02 | Category Filter on Product Listing | Allow customers to filter the product grid by a selected category. |
| F-03 | Category Product Count | Show the number of available products in each category. |
| F-04 | Active / Inactive Toggle | Inactive categories and their products are hidden from public views. |
| F-05 | Bilingual Names | Each category has an Arabic (`name_ar`) and English (`name_en`) label. |
| F-06 | Sort Order Control | Admin can define display order of categories via `sort_order` field. |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | Read-only: view active categories |
| Customer | Read-only: view active categories, filter products |
| Admin | Full CRUD: create, edit, delete, activate/deactivate categories |

### Screens Included

| Screen | Route | Auth | Description |
|--------|-------|------|-------------|
| Category Browser | `/categories` | None | Public grid of all active categories |
| Admin Category List | `/(admin)/categories` | Admin | Searchable table of all categories with actions |
| Admin Add Category | `/(admin)/categories/add` | Admin | Form to create a new category |
| Admin Edit Category | `/(admin)/categories/[id]/edit` | Admin | Form to edit an existing category |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `categories` | SELECT, INSERT, UPDATE, DELETE | Core category data |
| `products` | SELECT (COUNT) | Used to compute per-category product counts |
| `storage.objects` (bucket: `category-images`) | INSERT, DELETE | Category image uploads |

### Validation Rules

| Field | Rule |
|-------|------|
| `name_ar` | Required · 2–100 characters |
| `name_en` | Required · 2–100 characters |
| `image` (upload) | Optional · MIME type must be `image/*` · max 2 MB |
| `sort_order` | Optional · integer ≥ 0 · defaults to 0 |
| `is_active` | Boolean · defaults to `true` |
| Delete constraint | Cannot delete a category that has associated products (DB-level `ON DELETE RESTRICT`) |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-AUTH | Internal Module | Admin screens require admin role |
| `products` table | Database | Categories with products cannot be hard-deleted |
| Supabase Storage (`category-images`) | External Service | Category image bucket must be provisioned |
| TanStack Query `useCategories` hook | Internal State | Provides cached category list to product listing screen |

### Priority

> **HIGH** — Required before products can be organized or displayed. Must be completed in Sprint 1.

---

## Module 03 — Products

| Attribute | Detail |
|-----------|--------|
| **Module Name** | Products |
| **Module Code** | MOD-PROD |
| **Purpose** | Serves as the core catalog engine. Displays the full product listing and individual product details to all users. Provides availability status, discount display, image gallery, and category context for informed purchase decisions. |

### Main Features

| # | Feature | Description |
|---|---------|-------------|
| F-01 | Product Listing | Paginated/infinite-scroll grid of all available products with thumbnail, name, price, discount badge, and final price. |
| F-02 | Category Filter | Filter listing to products belonging to a selected category. |
| F-03 | Product Search | Full-text search by product name (`name_ar` or `name_en`). |
| F-04 | Product Detail View | Full details: image gallery, name, description, original price, discount %, computed final price, availability. |
| F-05 | Availability Display | Out-of-stock products shown with dimmed overlay and disabled "Add to Cart" button. |
| F-06 | Image Gallery | Swipeable multi-image gallery; first image (`is_primary = true`) used as thumbnail. |
| F-07 | Related Products | Horizontal scroll of products in the same category on the detail screen. |
| F-08 | Quantity Selector | Stepper control (+/−) on product detail before adding to cart. |
| F-09 | Bilingual Content | All product names and descriptions render in the active locale (AR/EN). |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | Read-only: browse, search, filter, view detail |
| Customer | Read-only + ability to add to cart (triggers login prompt if unauthenticated) |
| Admin | Read access via public screens; full management via MOD-APROD |

### Screens Included

| Screen | Route | Auth | Description |
|--------|-------|------|-------------|
| Product Listing / Home | `/` | None | Primary browsable catalog with filters and search |
| Product Detail | `/products/[id]` | None | Full product information and Add to Cart action |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `products` | SELECT | Filtered by `is_available = true` for public views |
| `product_images` | SELECT | Joined to products; primary image used for thumbnails |
| `categories` | SELECT | Used for filter pills and breadcrumb display |

### Validation Rules

| Rule | Detail |
|------|--------|
| Availability gate | Only products with `is_available = true` are returned by public queries |
| Active category gate | Products whose `category_id` references an inactive category should not appear in public listing |
| Quantity selector | Minimum 1; maximum 99 per session (configurable constant) |
| Search input | Sanitized; max 100 characters; no special characters that could form injection patterns |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-CAT | Internal Module | Category data required for filter and breadcrumb |
| MOD-PRICE | Internal Module | Pricing logic (discount display, final price) is computed within products context |
| MOD-CART | Internal Module | "Add to Cart" action triggers cart module |
| MOD-AUTH | Internal Module | Auth state determines whether cart action proceeds or prompts login |
| `product_images` table | Database | Must be populated for image gallery to render |
| TanStack Query | Internal State | Handles caching and background refresh of product data |

### Priority

> **HIGH** — Core revenue-generating module. Directly dependent on by Cart and Checkout. Must be completed in Sprint 1.

---

## Module 04 — Pricing and Discounts

| Attribute | Detail |
|-----------|--------|
| **Module Name** | Pricing and Discounts |
| **Module Code** | MOD-PRICE |
| **Purpose** | Governs how product pricing is stored, computed, and displayed across the application. Ensures that discounted prices are consistently calculated and that all monetary values are accurately presented and snapshotted at order time. |

### Main Features

| # | Feature | Description |
|---|---------|-------------|
| F-01 | Base Price Storage | Each product stores a `price` (numeric, 2 decimal places) as the non-discounted selling price. |
| F-02 | Discount Percentage | Admin sets `discount_pct` (0–100) per product. Zero means no discount. |
| F-03 | Auto-computed Final Price | `final_price` is a PostgreSQL **generated column**: `ROUND(price * (1 - discount_pct / 100), 2)` — always consistent. |
| F-04 | Discount Badge Display | Products with `discount_pct > 0` show a visible discount badge (e.g., "20% OFF") in listings and detail. |
| F-05 | Strikethrough Original Price | When a discount exists, the original price is shown with strikethrough styling alongside the final price. |
| F-06 | Price Snapshot on Order | At order creation, `unit_price`, `discount_pct`, and `final_price` are written to `order_items` — prices are immutable after ordering. |
| F-07 | Cart Total Calculation | Cart total sums `final_price × quantity` for all items. `discount_total` = sum of savings. |
| F-08 | Currency Display | Currency symbol and code are driven by environment config (`EXPO_PUBLIC_CURRENCY_SYMBOL`, `EXPO_PUBLIC_CURRENCY`). |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | Read-only: view prices and discounts on catalog screens |
| Customer | Read-only: view prices in catalog, cart, and order history |
| Admin | Write: set `price` and `discount_pct` on products; read computed `final_price` |

### Screens Involved

> Pricing is a cross-cutting concern. It surfaces on every screen that displays product data.

| Screen | Pricing Display |
|--------|----------------|
| Product Listing | Thumbnail price, discount badge, final price |
| Product Detail | Full price breakdown: original, discount %, final |
| Cart | Unit final price, line total, cart subtotal, discount total |
| Checkout | Order summary with all price components |
| Order Confirmation | Final totals snapshot |
| My Orders / Order Detail | Historical snapshotted prices |
| Admin Product Form | Input: `price`, `discount_pct`; computed preview: `final_price` |

### Main Database Tables Used

| Table | Column | Operation | Notes |
|-------|--------|-----------|-------|
| `products` | `price`, `discount_pct`, `final_price` | SELECT, UPDATE | `final_price` is DB-generated; never written directly |
| `cart_items` | — | SELECT | Final price read from joined `products.final_price` |
| `orders` | `subtotal`, `discount_total`, `total` | INSERT | Computed at checkout time |
| `order_items` | `unit_price`, `discount_pct`, `final_price`, `line_total` | INSERT | Snapshot captured at order creation |

### Validation Rules

| Field | Rule |
|-------|------|
| `price` | Required · numeric · ≥ 0 · max 10 digits, 2 decimal places |
| `discount_pct` | Required · numeric · 0 ≤ value ≤ 100 · max 2 decimal places · defaults to 0 |
| `final_price` (generated) | Not editable directly; auto-computed by DB — client must never override |
| Currency input | Strip non-numeric characters from price input fields on the client |
| Cart total accuracy | Always recalculate totals server-side (via DB query) before order insertion to prevent client-side manipulation |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-PROD | Internal Module | Price and discount fields live on the `products` table |
| MOD-CART | Internal Module | Cart totals are derived from pricing data |
| MOD-CHECKOUT | Internal Module | Order totals computed from cart pricing snapshot |
| `formatPrice` utility | Internal Utility | Centralizes currency formatting (e.g., `1,250.00 ﷼`) |
| Environment config | Config | Currency symbol and code driven by `.env` |

### Priority

> **HIGH** — Embedded in Products, Cart, and Checkout. No purchase flow is possible without accurate pricing. Implemented as part of Sprint 1 (schema) and Sprint 2 (display/cart).

---

## Module 05 — Cart

| Attribute | Detail |
|-----------|--------|
| **Module Name** | Cart |
| **Module Code** | MOD-CART |
| **Purpose** | Manages the customer's active shopping session. Allows adding, updating, and removing products before proceeding to checkout. Maintains consistency between local state and the database to prevent data loss across devices and sessions. |

### Main Features

| # | Feature | Description |
|---|---------|-------------|
| F-01 | Add to Cart | Authenticated customers add a product (with quantity) to their cart. One cart record exists per user (`UNIQUE` constraint). |
| F-02 | View Cart | Full list of cart items: product thumbnail, name, unit final price, quantity, line total. |
| F-03 | Update Quantity | Increase or decrease quantity of any cart item using a stepper. Minimum is 1. |
| F-04 | Remove Item | Remove a specific product from the cart. |
| F-05 | Empty Cart State | Friendly illustration and CTA to browse products when cart is empty. |
| F-06 | Cart Summary | Running subtotal, total discount savings, and grand total displayed at the bottom of the cart screen. |
| F-07 | Cart Badge Count | Cart item count displayed as a badge on the navigation tab/icon; updates in real time via Zustand. |
| F-08 | Guest Prompt | Guests attempting to add to cart see a modal prompting them to log in or register. |
| F-09 | DB Sync | Cart state is persisted in `cart_items` table; synced on app foreground, login, and each mutation. |
| F-10 | Out-of-Stock Guard | If a product becomes unavailable after being added to cart, it is flagged at checkout with a warning. |
| F-11 | Cart Cleared on Order | Cart is cleared atomically after a successful order placement (within DB transaction/RPC). |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | No access; redirected to login when Add to Cart is triggered |
| Customer | Full access: add, view, update, remove, proceed to checkout |
| Admin | Can use cart as a customer; no special admin-specific cart features |

### Screens Included

| Screen | Route | Auth | Description |
|--------|-------|------|-------------|
| Cart | `/(customer)/cart` | Customer | Full cart view with all items, quantities, totals, and checkout CTA |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `carts` | INSERT (auto-create), SELECT | One row per user; created on first add-to-cart |
| `cart_items` | INSERT, UPDATE, DELETE, SELECT | Individual line items in the cart |
| `products` | SELECT | Joined to get current price, name, image, and availability |
| `product_images` | SELECT | Primary image for cart item thumbnail |

### Validation Rules

| Rule | Detail |
|------|--------|
| Auth check | User must be authenticated; unauthenticated add triggers a login prompt |
| Quantity | Integer · min 1 · max 99 per line item |
| Duplicate product | If product already in cart, increment quantity rather than insert duplicate (`ON CONFLICT DO UPDATE`) |
| Availability | Products with `is_available = false` cannot be added; existing cart items with unavailable products flagged on cart screen |
| Cart not empty | Checkout CTA is disabled when cart has zero items |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-AUTH | Internal Module | Cart is auth-gated; user ID required for all cart operations |
| MOD-PROD | Internal Module | Product data (price, image, availability) joined on cart queries |
| MOD-PRICE | Internal Module | Final price from `products.final_price` drives line totals |
| MOD-CHECKOUT | Internal Module | Cart feeds directly into the checkout flow |
| Zustand `cartStore` | Internal State | Local cart state with badge count; synced to DB |
| `place_order` RPC | Database Function | Clears cart atomically when order is placed |

### Priority

> **HIGH** — Core transactional module. Directly blocks checkout. Must be completed in Sprint 2.

---

## Module 06 — Checkout

| Attribute | Detail |
|-----------|--------|
| **Module Name** | Checkout |
| **Module Code** | MOD-CHECKOUT |
| **Purpose** | Converts a customer's cart into a confirmed order. Collects delivery address and payment method, validates all inputs and cart state, creates the order record atomically in the database, and clears the cart. |

### Main Features

| # | Feature | Description |
|---|---------|-------------|
| F-01 | Order Summary Display | Read-only review of all cart items: name, quantity, unit price, line total, subtotal, discount total, grand total. |
| F-02 | Delivery Address Form | Collects full name, phone, street address, city, and optional notes. |
| F-03 | Payment Method Selection | Phase 1: Cash on Delivery only. Phase 2: card payment via gateway. |
| F-04 | Place Order | Atomic DB transaction (via RPC): insert `orders` + `order_items` + `delivery_addresses` + clear `cart_items`. |
| F-05 | Order Confirmation Screen | Displays generated order number and summary; prompts user to view My Orders. |
| F-06 | Price Re-validation | Before insert, server recalculates totals from current `products.final_price` to prevent client-side price manipulation. |
| F-07 | Availability Re-check | Before insert, all cart items are verified as `is_available = true`; unavailable items surface an error. |
| F-08 | Error Handling | Network errors, validation failures, and unavailable product errors shown with actionable messages. |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | No access; must be logged in |
| Customer | Full access |
| Admin | Can checkout as a customer; no special admin checkout |

### Screens Included

| Screen | Route | Auth | Description |
|--------|-------|------|-------------|
| Checkout | `/(customer)/checkout` | Customer | Address form, order summary, and Place Order CTA |
| Order Success | `/(customer)/order-success` | Customer | Confirmation screen with order number |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `orders` | INSERT | Created atomically via RPC |
| `order_items` | INSERT | Line items with snapshotted prices |
| `delivery_addresses` | INSERT | Delivery address stored against the order |
| `cart_items` | DELETE | Cleared atomically on successful order |
| `carts` | SELECT | Source of items for order |
| `products` | SELECT | Re-validated for availability and current price |

### Validation Rules

| Field | Rule |
|-------|------|
| Full Name | Required · 2–80 characters |
| Phone | Required · valid format (local or international) |
| Address | Required · 5–200 characters |
| City | Required · 2–50 characters |
| Notes | Optional · max 300 characters |
| Cart | Must have ≥ 1 item |
| All items | Must currently have `is_available = true` |
| Total | Server-computed; must match client-displayed total (within rounding tolerance) |
| Payment method | Must be one of the supported enum values |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-AUTH | Internal Module | Auth required; `user_id` embedded in order |
| MOD-CART | Internal Module | Cart must be non-empty and valid |
| MOD-PRICE | Internal Module | Totals re-validated server-side before insert |
| MOD-ORDERS | Internal Module | Checkout creates records consumed by Orders module |
| `place_order` RPC | Database Function | Atomic multi-table insert; rollbacks on any failure |
| MOD-ADDR | Internal Module | Delivery address form logic shared with Addresses module |

### Priority

> **HIGH** — Completes the core purchase flow. Must be completed in Sprint 2.

---

## Module 07 — Orders

| Attribute | Detail |
|-----------|--------|
| **Module Name** | Orders |
| **Module Code** | MOD-ORD |
| **Purpose** | Manages the full order lifecycle from placement to delivery. Serves as the central data record for all purchase transactions. Exposes order status visibility to customers and full management capabilities to admins. |

### Main Features

| # | Feature | Description |
|---|---------|-------------|
| F-01 | Order Record Creation | Order created atomically at checkout with `order_number` (auto-generated sequence), status `pending`, snapshotted items, address, and totals. |
| F-02 | Order Status Lifecycle | Status transitions: `pending` → `confirmed` → `preparing` → `shipped` → `delivered` (or `cancelled` at any pre-delivery stage). |
| F-03 | Status Update by Admin | Admin can change order status from the Admin Order Detail screen. |
| F-04 | Order Number | Human-readable, unique order reference (e.g., `ORD-000042`) generated via PostgreSQL sequence. |
| F-05 | Immutable Price Snapshot | `order_items` store `unit_price`, `discount_pct`, `final_price`, and `line_total` at the moment of order — never recalculated. |
| F-06 | Admin Order List | Filterable and searchable table of all orders across all customers. |
| F-07 | Admin Order Detail | Full breakdown including customer info, items, address, payment method, and status control. |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | No access |
| Customer | Read-only: own orders only (enforced by RLS) |
| Admin | Full read + status update on all orders |

### Screens Included

| Screen | Route | Auth | Description |
|--------|-------|------|-------------|
| Admin Order List | `/(admin)/orders` | Admin | All orders with filter tabs by status |
| Admin Order Detail | `/(admin)/orders/[id]` | Admin | Full order view with status update control |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `orders` | INSERT (checkout), SELECT, UPDATE (status) | Central order record |
| `order_items` | INSERT (checkout), SELECT | Line items snapshotted at order time |
| `delivery_addresses` | INSERT (checkout), SELECT | Delivery info per order |
| `profiles` | SELECT | Customer name/phone for admin order view |

### Validation Rules

| Rule | Detail |
|------|--------|
| Status transition | Only valid status values allowed (DB `CHECK` constraint) |
| Status update auth | Only admin role may update order status (RLS policy) |
| Customer read scope | Customers can only SELECT orders where `user_id = auth.uid()` (RLS) |
| Order number | Auto-generated via `order_seq` sequence; never manually set |
| Cancellation | Cannot cancel an order with status `delivered` |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-CHECKOUT | Internal Module | Creates all order records |
| MOD-AUTH | Internal Module | All order operations require authentication |
| MOD-MYORDERS | Internal Module | Customer-facing view reads from orders tables |
| `order_seq` | Database Sequence | Must be created in migration before any orders are placed |
| `profiles` table | Database | Joined for customer contact info in admin view |

### Priority

> **HIGH** — Core business record. Required for checkout and post-purchase visibility. Must be completed in Sprint 2–3.

---

## Module 08 — My Orders

| Attribute | Detail |
|-----------|--------|
| **Module Name** | My Orders |
| **Module Code** | MOD-MYORD |
| **Purpose** | Provides the authenticated customer with a full history of their placed orders, allowing them to track status and review past purchases. Builds customer trust and enables post-purchase confidence. |

### Main Features

| # | Feature | Description |
|---|---------|-------------|
| F-01 | Orders List | Chronologically sorted list of all orders placed by the logged-in customer. |
| F-02 | Order Card Summary | Each order shows: order number, date placed, total items, grand total, and status badge. |
| F-03 | Status Badge | Color-coded badge per status: pending (grey), confirmed (blue), preparing (orange), shipped (purple), delivered (green), cancelled (red). |
| F-04 | Order Detail View | Full breakdown: items with images, quantities, prices, delivery address, payment method, and current status. |
| F-05 | Empty State | Friendly message and CTA to start shopping when no orders exist. |
| F-06 | Reorder (Phase 2) | One-tap to re-add all items from a previous order to the current cart. |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | No access |
| Customer | Read-only: own orders only |
| Admin | Not applicable (admins use MOD-ORD for order management) |

### Screens Included

| Screen | Route | Auth | Description |
|--------|-------|------|-------------|
| My Orders List | `/(customer)/orders` | Customer | Paginated list of customer's own orders |
| My Order Detail | `/(customer)/orders/[id]` | Customer | Full detail view of a single order |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `orders` | SELECT | Filtered by `user_id = auth.uid()` via RLS |
| `order_items` | SELECT | Joined for item details |
| `delivery_addresses` | SELECT | Joined for delivery info display |
| `products` | SELECT | Product name/image for display (from order_items snapshot fields) |
| `product_images` | SELECT | Primary image for order item thumbnail |

### Validation Rules

| Rule | Detail |
|------|--------|
| Data scope | RLS enforces that customers can only read their own orders — no client-side filtering needed |
| Order ID ownership | Before rendering detail screen, verify `order.user_id = auth.uid()` (enforced by RLS, double-checked in route) |
| Empty list | Handled gracefully with UI state rather than an error |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-AUTH | Internal Module | Customer must be authenticated |
| MOD-ORD | Internal Module | Order records created by the Orders module |
| MOD-CHECKOUT | Internal Module | Orders are placed via checkout |
| TanStack Query | Internal State | Cached order list with background refresh |

### Priority

> **HIGH** — Standard e-commerce expectation; critical for customer trust. Must be completed in Sprint 2.

---

## Module 09 — Admin Product Management

| Attribute | Detail |
|-----------|--------|
| **Module Name** | Admin Product Management |
| **Module Code** | MOD-APROD |
| **Purpose** | Gives admins complete control over the product catalog. Enables creation, editing, deletion, image management, availability toggling, and pricing/discount configuration for all products. |

### Main Features

| # | Feature | Description |
|---|---------|-------------|
| F-01 | Product List View | Searchable and sortable table of all products (including unavailable) with inline actions. |
| F-02 | Add Product | Form to create a new product with all fields. |
| F-03 | Edit Product | Form pre-filled with existing data; all fields editable. |
| F-04 | Delete Product | Soft-delete: set `is_available = false` and mark with `deleted_at` (or hard-delete if no order history). |
| F-05 | Toggle Availability | Quick in-line toggle on the list view; sets `is_available` true/false. |
| F-06 | Image Upload | Multi-image upload to Supabase Storage; set primary image; reorder gallery. |
| F-07 | Image Delete | Remove individual images from product gallery; storage object also deleted. |
| F-08 | Set Pricing and Discount | Set `price` and `discount_pct`; computed `final_price` shown in real time on the form. |
| F-09 | Category Assignment | Dropdown to assign product to one active category. |
| F-10 | Bilingual Content | Separate input fields for `name_ar`, `name_en`, `description_ar`, `description_en`. |
| F-11 | Product Search | Admin-side search by name across both Arabic and English fields. |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | No access |
| Customer | No access |
| Admin | Full CRUD, image management, availability control |

### Screens Included

| Screen | Route | Auth | Description |
|--------|-------|------|-------------|
| Admin Product List | `/(admin)/products` | Admin | Full searchable, sortable product table |
| Admin Add Product | `/(admin)/products/add` | Admin | Create new product form |
| Admin Edit Product | `/(admin)/products/[id]/edit` | Admin | Edit existing product form |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `products` | SELECT, INSERT, UPDATE, DELETE | Full CRUD |
| `product_images` | SELECT, INSERT, UPDATE, DELETE | Image records per product |
| `categories` | SELECT | Populate category dropdown |
| `storage.objects` (bucket: `product-images`) | INSERT, DELETE | Image file management |

### Validation Rules

| Field | Rule |
|-------|------|
| `name_ar` | Required · 2–100 characters |
| `name_en` | Required · 2–100 characters |
| `description_ar` | Optional · max 1000 characters |
| `description_en` | Optional · max 1000 characters |
| `price` | Required · numeric ≥ 0 · max 2 decimal places |
| `discount_pct` | Required · 0–100 · max 2 decimal places · defaults to 0 |
| `category_id` | Required · must reference an existing active category |
| Image upload | Optional · MIME `image/*` · max 2 MB per file · max 5 images per product |
| Delete guard | Products with existing orders are soft-deleted only; hard delete blocked if `order_items` references exist |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-AUTH | Internal Module | Admin role required |
| MOD-CAT | Internal Module | Category dropdown populated from categories module |
| MOD-PRICE | Internal Module | Price/discount form fields follow pricing module rules |
| Supabase Storage (`product-images`) | External Service | Bucket must be provisioned with correct policies |
| `storageService` | Internal Service | Handles upload, URL generation, and deletion |

### Priority

> **HIGH** — Without products in the catalog, no purchase flow is possible. Must be completed in Sprint 3.

---

## Module 10 — Admin Category Management

| Attribute | Detail |
|-----------|--------|
| **Module Name** | Admin Category Management |
| **Module Code** | MOD-ACAT |
| **Purpose** | Gives admins full control over the product taxonomy. Enables creation, editing, reordering, activation, and deletion of product categories, keeping the public catalog organized and navigable. |

### Main Features

| # | Feature | Description |
|---|---------|-------------|
| F-01 | Category List View | Table of all categories (active and inactive) with product count, status, and actions. |
| F-02 | Add Category | Form to create a new category (bilingual names, image, sort order, active flag). |
| F-03 | Edit Category | Pre-filled form; update any field including replacing the category image. |
| F-04 | Delete Category | Hard delete only if no products are assigned; otherwise blocked with an error message. |
| F-05 | Activate / Deactivate | Toggle `is_active`; inactive categories and their products are hidden from public catalog. |
| F-06 | Image Upload | Upload and replace category image in Supabase Storage. |
| F-07 | Sort Order | Admin sets `sort_order` to control display sequence in public category listing. |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | No access |
| Customer | No access |
| Admin | Full CRUD, image management |

### Screens Included

| Screen | Route | Auth | Description |
|--------|-------|------|-------------|
| Admin Category List | `/(admin)/categories` | Admin | Table of all categories |
| Admin Add Category | `/(admin)/categories/add` | Admin | Create new category form |
| Admin Edit Category | `/(admin)/categories/[id]/edit` | Admin | Edit existing category form |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `categories` | SELECT, INSERT, UPDATE, DELETE | Full category management |
| `products` | SELECT (COUNT) | Check if products exist before delete; show count in list |
| `storage.objects` (bucket: `category-images`) | INSERT, DELETE | Category image file management |

### Validation Rules

| Field | Rule |
|-------|------|
| `name_ar` | Required · 2–100 characters |
| `name_en` | Required · 2–100 characters |
| `sort_order` | Optional · integer ≥ 0 |
| Image | Optional · MIME `image/*` · max 2 MB |
| Delete constraint | Cannot delete category if any products reference it (`ON DELETE RESTRICT` + application-level check with user-facing error) |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-AUTH | Internal Module | Admin role required |
| MOD-APROD | Internal Module | Products depend on categories existing |
| Supabase Storage (`category-images`) | External Service | Bucket must exist |
| `storageService` | Internal Service | Image upload and delete |

### Priority

> **HIGH** — Categories must exist before products can be created. Complete before or alongside MOD-APROD in Sprint 3.

---

## Module 11 — User Profile

| Attribute | Detail |
|-----------|--------|
| **Module Name** | User Profile |
| **Module Code** | MOD-PROF |
| **Purpose** | Allows authenticated customers to view and update their personal information, change their password, and access account-related links. Provides a personalized hub for account management. |

### Main Features

| # | Feature | Description |
|---|---------|-------------|
| F-01 | View Profile | Display current full name, email, and phone number. |
| F-02 | Edit Profile | Update full name and phone. Email is read-only (requires Supabase Auth update for email change — Phase 2). |
| F-03 | Change Password | Form with current password verification, new password, and confirm new password. |
| F-04 | Logout | Terminates session and redirects to public home. |
| F-05 | Link to My Orders | Quick navigation to My Orders screen from profile. |
| F-06 | Account Deletion (Phase 2) | Customer can request account and data deletion in compliance with privacy regulations. |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | No access |
| Customer | Read and update own profile only |
| Admin | Admin profile managed via same screen; role field is not editable by user |

### Screens Included

| Screen | Route | Auth | Description |
|--------|-------|------|-------------|
| Profile | `/(customer)/profile` | Customer | View and edit personal info; logout; links |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `profiles` | SELECT, UPDATE | `full_name`, `phone` fields only; `role` not exposed for editing |
| `auth.users` | (via Supabase Auth SDK) | Email and password changes handled by Supabase Auth API |

### Validation Rules

| Field | Rule |
|-------|------|
| `full_name` | Required · 2–80 characters |
| `phone` | Optional · valid phone format |
| Current password (change password flow) | Required · verified via `supabase.auth.updateUser` which requires re-authentication |
| New password | Required · min 8 characters · at least 1 letter and 1 digit |
| Confirm new password | Must match new password |
| `role` field | Not exposed in UI; cannot be changed by user (RLS prevents update) |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-AUTH | Internal Module | Must be logged in; session provides `auth.uid()` |
| MOD-MYORD | Internal Module | "My Orders" link navigates to orders screen |
| Supabase Auth SDK | External Service | `updateUser()` used for password change |

### Priority

> **MEDIUM** — Important for user retention and trust but does not block the purchase flow. Complete in Sprint 3–4.

---

## Module 12 — Addresses

| Attribute | Detail |
|-----------|--------|
| **Module Name** | Addresses |
| **Module Code** | MOD-ADDR |
| **Purpose** | Handles the collection and storage of delivery address information. For MVP, addresses are captured at checkout and stored per order. A future phase may allow customers to save multiple reusable addresses for faster checkouts. |

### Main Features

| # | Feature | Description |
|---|---------|-------------|
| F-01 | Address Capture at Checkout | During checkout, customer fills in a delivery address form (full name, phone, street address, city, notes). |
| F-02 | Address Stored per Order | Address is stored in `delivery_addresses` linked to the specific order (not to the user profile in MVP). |
| F-03 | Address Display in Order History | Stored delivery address shown in My Order Detail and Admin Order Detail. |
| F-04 | Saved Addresses (Phase 2) | Allow customers to save multiple named addresses and select one at checkout without re-typing. |
| F-05 | Default Address (Phase 2) | Customer can mark one address as default; pre-filled at checkout. |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | No access |
| Customer | Write: capture address at checkout · Read: view in order history |
| Admin | Read-only: view delivery address in admin order detail |

### Screens Involved

| Screen | Module Context | Usage |
|--------|---------------|-------|
| Checkout | MOD-CHECKOUT | Address form is embedded in the checkout screen |
| My Order Detail | MOD-MYORD | Address displayed (read-only) |
| Admin Order Detail | MOD-ORD | Address displayed (read-only) |
| Saved Addresses (Phase 2) | MOD-ADDR | Standalone screen for managing saved addresses |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `delivery_addresses` | INSERT (via checkout), SELECT | One record per order in MVP |
| `orders` | SELECT | Used to verify address ownership via order's `user_id` |

### Validation Rules

| Field | Rule |
|-------|------|
| Full Name | Required · 2–80 characters |
| Phone | Required · valid phone number format |
| Address (street) | Required · 5–200 characters |
| City | Required · 2–50 characters |
| Notes | Optional · max 300 characters |
| Ownership | Each `delivery_addresses` row is protected by RLS via `orders.user_id = auth.uid()` |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-AUTH | Internal Module | Auth required for address write |
| MOD-CHECKOUT | Internal Module | Address form embedded in checkout |
| MOD-ORD / MOD-MYORD | Internal Module | Address read back in order detail views |
| Zod `checkoutSchema` | Internal Schema | Address fields validated as part of the checkout Zod schema |

### Priority

> **MEDIUM** — Address capture is part of checkout (High priority) but the address module itself (saved addresses, management) is Medium priority and Phase 2 for advanced features.

---

## Module 13 — Notifications

| Attribute | Detail |
|-----------|--------|
| **Module Name** | Notifications |
| **Module Code** | MOD-NOTIF |
| **Purpose** | Informs customers and admins about important events: order confirmations, status changes, and promotional alerts. MVP covers in-app feedback (toasts, confirmation screens). Push and email notifications are Phase 2 features. |

### Main Features

#### MVP (In-App Only)

| # | Feature | Description |
|---|---------|-------------|
| F-01 | Order Confirmation Toast | Success toast/alert immediately after order is placed. |
| F-02 | Order Success Screen | Full confirmation screen with order number after checkout. |
| F-03 | Error Toasts | Contextual error messages for failed operations (add to cart, checkout failure, etc.). |
| F-04 | Action Feedback | Loading states, success confirmations, and error feedback on all form submissions. |

#### Phase 2 (Push + Email)

| # | Feature | Description |
|---|---------|-------------|
| F-05 | Push Notification: Order Confirmed | Triggered when admin changes status to `confirmed`. |
| F-06 | Push Notification: Order Shipped | Triggered when admin changes status to `shipped`. |
| F-07 | Push Notification: Order Delivered | Triggered when admin changes status to `delivered`. |
| F-08 | Email Notification: Order Placed | Order summary sent to customer email on placement. |
| F-09 | Admin New Order Alert | Notify admin (push/email) when a new order is placed. |
| F-10 | Promotional Push (Phase 3) | Broadcast promotional messages to opted-in customers. |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | In-app error/info messages only |
| Customer | Order lifecycle notifications; promotional alerts |
| Admin | New order alerts; system event notifications |

### Screens Involved

| Screen | Module Context | Notification Type |
|--------|---------------|-------------------|
| All screens | Global | Error/success toasts via toast provider |
| Order Success | MOD-CHECKOUT | In-app order confirmation |
| My Order Detail | MOD-MYORD | Status change context |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `orders` | SELECT (Phase 2) | Supabase Realtime subscription triggers push on status change |
| `profiles` | SELECT (Phase 2) | Get push token and notification preferences |

### Phase 2 Technical Approach

| Component | Technology |
|-----------|-----------|
| Push delivery | Expo Notifications + Expo Push Service |
| Trigger | Supabase Edge Function on `orders` UPDATE event |
| Token storage | Add `push_token` column to `profiles` |
| Email | Supabase Auth emails (order confirmation via Edge Function + email template) |

### Validation Rules

| Rule | Detail |
|------|--------|
| Push token | Must be a valid Expo push token before storing; validated on registration |
| Notification opt-in | Customer must grant push permission; store consent in `profiles.push_enabled` (Phase 2) |
| Rate limiting | No more than 1 push per order per status transition |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-AUTH | Internal Module | Push token tied to authenticated user |
| MOD-ORD | Internal Module | Order status changes trigger notifications |
| Expo Notifications SDK | External (Phase 2) | Push notification infrastructure |
| Supabase Edge Functions | External (Phase 2) | Server-side notification triggers |
| Supabase Realtime | External (Phase 2) | DB change listeners for status updates |

### Priority

> **MEDIUM** (in-app: MVP) · **Phase 2** (push/email) — In-app feedback is part of standard UX quality. Push/email notifications are deferred to Phase 2.

---

## Module 14 — Reports (Future Phase)

| Attribute | Detail |
|-----------|--------|
| **Module Name** | Reports & Analytics |
| **Module Code** | MOD-RPT |
| **Purpose** | Provides admins with actionable business intelligence: sales performance, product popularity, order volumes, and revenue trends. Enables data-driven decisions without requiring external analytics tools. Planned for Phase 3. |

### Main Features

| # | Feature | Phase | Description |
|---|---------|-------|-------------|
| F-01 | KPI Dashboard Cards | MVP (basic) | Today's orders count, total revenue, active products, new customers |
| F-02 | Orders by Status Chart | Phase 2 | Doughnut/pie chart of order distribution by status |
| F-03 | Revenue Over Time | Phase 3 | Line chart of daily/weekly/monthly revenue |
| F-04 | Top Selling Products | Phase 3 | Ranked list by quantity sold in a date range |
| F-05 | Category Performance | Phase 3 | Revenue and volume breakdown by product category |
| F-06 | Customer Acquisition | Phase 3 | New vs. returning customers over time |
| F-07 | Export to CSV | Phase 3 | Export orders, products, or revenue data |
| F-08 | Date Range Filter | Phase 3 | All report widgets filterable by custom date range |
| F-09 | Low-Stock Alerts | Phase 3 | Flag products nearing out-of-stock (requires inventory count feature) |

### User Roles Involved

| Role | Access Level |
|------|-------------|
| Guest | No access |
| Customer | No access |
| Admin | Full read access to all reports and exports |

### Screens Included

| Screen | Route | Auth | Description |
|--------|-------|------|-------------|
| Admin Dashboard | `/(admin)/dashboard` | Admin | KPI cards + basic metrics (MVP phase) |
| Reports (Phase 3) | `/(admin)/reports` | Admin | Full report suite with charts and export |

### Main Database Tables Used

| Table | Operation | Notes |
|-------|-----------|-------|
| `orders` | SELECT (aggregate) | Count, sum, group by status/date |
| `order_items` | SELECT (aggregate) | Product quantity sold, revenue per SKU |
| `products` | SELECT | Product names for report labels |
| `categories` | SELECT | Category names for category-level reports |
| `profiles` | SELECT (COUNT) | Customer acquisition metrics |
| Database Views (Phase 3) | SELECT | Materialized views for expensive aggregates |

### Validation Rules

| Rule | Detail |
|------|--------|
| Date range | Start date must be ≤ end date; max range 365 days for performance |
| Export | Paginated; max 10,000 rows per export to prevent memory issues |
| Access | Admin-only; all queries filtered by RLS |
| Aggregate queries | Use DB-level aggregation, not client-side processing of raw data |

### Technical Approach (Phase 3)

| Component | Technology |
|-----------|-----------|
| Charts | `victory-native` or `react-native-gifted-charts` |
| Aggregation | Supabase RPC functions (PostgreSQL aggregation queries) |
| Materialized views | For heavy cross-table aggregates (refresh periodically or on-demand) |
| CSV Export | Edge Function that streams CSV response |

### Dependencies

| Dependency | Type | Notes |
|-----------|------|-------|
| MOD-AUTH | Internal Module | Admin role required |
| MOD-ORD | Internal Module | Order data is the primary data source |
| MOD-APROD | Internal Module | Product names and categories for labeling |
| Supabase RPC | Database | Aggregate functions for performance |

### Priority

> **LOW** — Phase 3 feature. Basic KPI cards (F-01) are included in MVP admin dashboard. Full reporting suite is deferred until Phase 3 after core commerce flows are stable.

---

## Module Dependency Map

```
MOD-AUTH ──────────────────────────────────────────────────┐
  │                                                         │
  ├── MOD-CAT  ────────────────────────────────────────┐   │
  │     └── MOD-ACAT                                   │   │
  │                                                    │   │
  ├── MOD-PROD ─── MOD-PRICE ──────────────────────┐  │   │
  │     └── MOD-APROD                               │  │   │
  │                                                 │  │   │
  ├── MOD-CART ──────────────────────────────────┐  │  │   │
  │                                              │  │  │   │
  ├── MOD-CHECKOUT ──── MOD-ADDR ──────────────┐ │  │  │   │
  │                                            │ │  │  │   │
  ├── MOD-ORD ◄───────────────────────────────┘ │  │  │   │
  │     │                                        │  │  │   │
  │     └── MOD-MYORD ◄────────────────────────  │  │  │   │
  │                                                │  │  │   │
  ├── MOD-PROF                                     │  │  │   │
  │                                                │  │  │   │
  ├── MOD-NOTIF ◄──────────────────────────────────┘  │  │   │
  │                                                    │  │   │
  └── MOD-RPT ◄───────────────────────────────────────┘  │   │
                                                          │   │
  All public catalog screens ◄──────────────────────────┘   │
  All screens (auth context) ◄───────────────────────────────┘
```

---

## Summary Table

| Module | Code | Priority | Sprint | Auth Required | DB Tables | Roles |
|--------|------|----------|--------|---------------|-----------|-------|
| Authentication | MOD-AUTH | **High** | S1 | No (entry) | `profiles`, `auth.users` | All |
| Categories | MOD-CAT | **High** | S1 | No | `categories` | All |
| Products | MOD-PROD | **High** | S1 | No | `products`, `product_images`, `categories` | All |
| Pricing & Discounts | MOD-PRICE | **High** | S1–S2 | No | `products`, `order_items`, `orders` | All (read), Admin (write) |
| Cart | MOD-CART | **High** | S2 | Customer | `carts`, `cart_items`, `products` | Customer |
| Checkout | MOD-CHECKOUT | **High** | S2 | Customer | `orders`, `order_items`, `delivery_addresses`, `cart_items` | Customer |
| Orders | MOD-ORD | **High** | S2–S3 | Customer + Admin | `orders`, `order_items`, `delivery_addresses`, `profiles` | Customer, Admin |
| My Orders | MOD-MYORD | **High** | S2 | Customer | `orders`, `order_items`, `delivery_addresses` | Customer |
| Admin Product Mgmt | MOD-APROD | **High** | S3 | Admin | `products`, `product_images`, `categories`, `storage` | Admin |
| Admin Category Mgmt | MOD-ACAT | **High** | S3 | Admin | `categories`, `products`, `storage` | Admin |
| User Profile | MOD-PROF | **Medium** | S3–S4 | Customer | `profiles`, `auth.users` | Customer |
| Addresses | MOD-ADDR | **Medium** | S2 (embedded) | Customer | `delivery_addresses`, `orders` | Customer, Admin (read) |
| Notifications | MOD-NOTIF | **Medium** (MVP in-app) | S4 (push: Phase 2) | Customer + Admin | `orders`, `profiles` | Customer, Admin |
| Reports | MOD-RPT | **Low** | Phase 3 | Admin | `orders`, `order_items`, `products`, `profiles` | Admin |

---

*Document Status: **FINAL** — Aligned with PROJECT_PLANNING.md v1.0*  
*Next Step: Use this breakdown as the input for technical tickets and sprint task creation.*
