-- ========== 001_create_enums.sql ==========
-- 001_create_enums.sql
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'super_admin');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash_on_delivery', 'online');
CREATE TYPE notification_type AS ENUM ('order_update', 'promotion', 'system');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE inventory_action AS ENUM ('restock', 'sale', 'adjustment', 'return');


-- ========== 002_create_profiles.sql ==========
-- 002_create_profiles.sql
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  phone       TEXT,
  avatar_url  TEXT,
  role        user_role NOT NULL DEFAULT 'customer',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ========== 003_create_categories.sql ==========
-- 003_create_categories.sql
CREATE TABLE categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar         TEXT NOT NULL,
  name_en         TEXT,
  description_ar  TEXT,
  description_en  TEXT,
  image_url       TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ========== 004_create_products.sql ==========
-- 004_create_products.sql
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name_ar         TEXT NOT NULL,
  name_en         TEXT,
  slug            TEXT NOT NULL UNIQUE,
  description_ar  TEXT,
  description_en  TEXT,
  price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  discount_price  NUMERIC(10,2) CHECK (discount_price >= 0),
  stock_quantity  INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  weight          NUMERIC(8,3),
  weight_unit     TEXT DEFAULT 'kg',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT discount_less_than_price CHECK (discount_price IS NULL OR discount_price < price)
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_available ON products(is_available);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_slug ON products(slug);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ========== 005_create_product_images.sql ==========
-- 005_create_product_images.sql
CREATE TABLE product_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  storage_path TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product_id ON product_images(product_id);

-- Ensure only one primary image per product
CREATE UNIQUE INDEX idx_product_images_primary
  ON product_images(product_id)
  WHERE is_primary = TRUE;


-- ========== 006_create_carts.sql ==========
-- 006_create_carts.sql
CREATE TABLE carts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carts_user_id_unique UNIQUE (user_id)
);

CREATE TABLE cart_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INT NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 99),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cart_items_unique UNIQUE (cart_id, product_id)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);

CREATE TRIGGER carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ========== 007_create_addresses.sql ==========
-- 007_create_addresses.sql
CREATE TABLE addresses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label             TEXT NOT NULL,
  recipient_name    TEXT NOT NULL,
  phone             TEXT NOT NULL,
  city              TEXT NOT NULL,
  district          TEXT,
  street            TEXT,
  building_number   TEXT,
  floor_number      TEXT,
  apartment_number  TEXT,
  notes             TEXT,
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);

-- Only one default per user
CREATE UNIQUE INDEX idx_addresses_default
  ON addresses(user_id)
  WHERE is_default = TRUE;

-- Trigger: when a new default address is set, clear the previous default for that user
CREATE OR REPLACE FUNCTION unset_other_default_address()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE addresses
    SET is_default = FALSE
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_unset_other_default_address
  BEFORE INSERT OR UPDATE OF is_default ON addresses
  FOR EACH ROW EXECUTE FUNCTION unset_other_default_address();

CREATE TRIGGER addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ========== 008_create_orders.sql ==========
-- 008_create_orders.sql
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  order_number    TEXT NOT NULL UNIQUE,
  status          order_status NOT NULL DEFAULT 'pending',
  total_amount    NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  delivery_fee    NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Snapshot of delivery address at order time
  delivery_address JSONB NOT NULL,

  payment_method  payment_method NOT NULL DEFAULT 'cash_on_delivery',
  payment_status  payment_status NOT NULL DEFAULT 'pending',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Auto-generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE TRIGGER orders_set_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ========== 009_create_order_items.sql ==========
-- 009_create_order_items.sql
CREATE TABLE order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  -- Snapshot of product data at order time
  product_name_ar   TEXT NOT NULL,
  product_name_en   TEXT,
  unit_price        NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity          INT NOT NULL CHECK (quantity > 0),
  total_price       NUMERIC(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);


-- ========== 010_create_order_status_history.sql ==========
-- 010_create_order_status_history.sql
CREATE TABLE order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status      order_status NOT NULL,
  note        TEXT,
  changed_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

-- Auto-insert status history on order status change
CREATE OR REPLACE FUNCTION record_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO order_status_history (order_id, status)
    VALUES (NEW.id, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_status_history
  AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION record_order_status_change();


-- ========== 011_create_notifications.sql ==========
-- 011_create_notifications.sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title_ar    TEXT NOT NULL,
  title_en    TEXT,
  body_ar     TEXT NOT NULL,
  body_en     TEXT,
  type        notification_type NOT NULL DEFAULT 'system',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  data        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);


-- ========== 012_create_favorites.sql ==========
-- 012_create_favorites.sql
CREATE TABLE favorites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT favorites_unique UNIQUE (user_id, product_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);


-- ========== 013_create_reviews.sql ==========
-- 013_create_reviews.sql
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  status      review_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One review per user per product
  CONSTRAINT reviews_unique UNIQUE (user_id, product_id)
);

CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_status ON reviews(status);

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ========== 014_create_inventory_logs.sql ==========
-- 014_create_inventory_logs.sql
CREATE TABLE inventory_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  action          inventory_action NOT NULL,
  quantity_change INT NOT NULL,
  quantity_before INT NOT NULL,
  quantity_after  INT NOT NULL,
  reference_id    UUID,     -- order_id or other reference
  note            TEXT,
  performed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_logs_product_id ON inventory_logs(product_id);


-- ========== 015_enable_rls.sql ==========
-- 015_enable_rls.sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;


-- ========== 016_rls_policies.sql ==========
-- 016_rls_policies.sql

-- Helper: check if current user is admin/super_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role IN ('admin', 'super_admin')
  FROM profiles
  WHERE id = auth.uid()
$$;

-- profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- categories (public read)
CREATE POLICY "Anyone can read active categories" ON categories
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL USING (is_admin());

-- products (public read)
CREATE POLICY "Anyone can read available products" ON products
  FOR SELECT USING (is_available = TRUE);
CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (is_admin());

-- product_images (public read)
CREATE POLICY "Anyone can read product images" ON product_images
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage product images" ON product_images
  FOR ALL USING (is_admin());

-- carts
CREATE POLICY "Users can manage their own cart" ON carts
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own cart items" ON cart_items
  FOR ALL USING (
    cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid())
  );

-- addresses
CREATE POLICY "Users can manage their own addresses" ON addresses
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- orders
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (is_admin());

-- order_items
CREATE POLICY "Users can view their own order items" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins can manage all order items" ON order_items
  FOR ALL USING (is_admin());

-- order_status_history
CREATE POLICY "Users can view their order history" ON order_status_history
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins can manage order status history" ON order_status_history
  FOR ALL USING (is_admin());

-- notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage notifications" ON notifications
  FOR ALL USING (is_admin());

-- favorites
CREATE POLICY "Users can manage their own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

-- reviews
CREATE POLICY "Anyone can read approved reviews" ON reviews
  FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can manage their own reviews" ON reviews
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all reviews" ON reviews
  FOR ALL USING (is_admin());

-- inventory_logs
CREATE POLICY "Admins can manage inventory logs" ON inventory_logs
  FOR ALL USING (is_admin());


-- ========== 017_place_order_function.sql ==========
-- 017_place_order_function.sql
-- Atomic order placement: validates cart, creates order + items, decrements stock, clears cart
CREATE OR REPLACE FUNCTION public.place_order(
  p_address_id    UUID,
  p_payment_method payment_method DEFAULT 'cash_on_delivery',
  p_notes         TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_cart_id       UUID;
  v_order_id      UUID;
  v_total         NUMERIC(10,2) := 0;
  v_address       JSONB;
  v_item          RECORD;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  -- Get cart
  SELECT id INTO v_cart_id FROM carts WHERE user_id = v_user_id;
  IF v_cart_id IS NULL THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  -- Validate cart has items
  IF NOT EXISTS (SELECT 1 FROM cart_items WHERE cart_id = v_cart_id) THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  -- Validate and snapshot address
  SELECT to_jsonb(a.*) INTO v_address
  FROM addresses a
  WHERE a.id = p_address_id AND a.user_id = v_user_id;

  IF v_address IS NULL THEN
    RAISE EXCEPTION 'INVALID_ADDRESS';
  END IF;

  -- Calculate total & validate stock
  FOR v_item IN
    SELECT ci.quantity, p.id AS product_id, p.name_ar, p.name_en,
           COALESCE(p.discount_price, p.price) AS unit_price,
           p.stock_quantity
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart_id AND p.is_available = TRUE
  LOOP
    IF v_item.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:% (%)', v_item.name_ar, v_item.product_id;
    END IF;
    v_total := v_total + (v_item.unit_price * v_item.quantity);
  END LOOP;

  -- Create order
  INSERT INTO orders (user_id, status, total_amount, delivery_address, payment_method, notes)
  VALUES (v_user_id, 'pending', v_total, v_address, p_payment_method, p_notes)
  RETURNING id INTO v_order_id;

  -- Insert order items & decrement stock
  FOR v_item IN
    SELECT ci.quantity, p.id AS product_id, p.name_ar, p.name_en,
           COALESCE(p.discount_price, p.price) AS unit_price
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart_id
  LOOP
    INSERT INTO order_items (order_id, product_id, product_name_ar, product_name_en, unit_price, quantity)
    VALUES (v_order_id, v_item.product_id, v_item.name_ar, v_item.name_en, v_item.unit_price, v_item.quantity);

    UPDATE products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id;

    -- Log inventory
    INSERT INTO inventory_logs (product_id, action, quantity_change, quantity_before, quantity_after, reference_id)
    SELECT v_item.product_id, 'sale', -v_item.quantity,
           stock_quantity + v_item.quantity, stock_quantity, v_order_id
    FROM products WHERE id = v_item.product_id;
  END LOOP;

  -- Clear cart
  DELETE FROM cart_items WHERE cart_id = v_cart_id;

  -- Record initial status history
  INSERT INTO order_status_history (order_id, status) VALUES (v_order_id, 'pending');

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', (SELECT order_number FROM orders WHERE id = v_order_id),
    'total_amount', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_order(UUID, payment_method, TEXT) TO authenticated;


-- ========== 018_storage_buckets.sql ==========
-- 018_storage_buckets.sql
-- Create storage buckets (run via Supabase dashboard or CLI)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', TRUE, 2097152, ARRAY['image/jpeg','image/png','image/webp']),
  ('category-images', 'category-images', TRUE, 2097152, ARRAY['image/jpeg','image/png','image/webp']),
  ('avatars', 'avatars', TRUE, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "Admins delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "Public read category images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'category-images');

CREATE POLICY "Admins manage category images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'category-images' AND is_admin());

CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');


-- ========== 019_seed_dev_data.sql ==========
-- 019_seed_dev_data.sql
-- Seed data for local development only — do NOT run in production

INSERT INTO categories (name_ar, name_en, sort_order, is_active) VALUES
  ('تمور وحلويات', 'Dates & Sweets', 1, TRUE),
  ('عسل طبيعي', 'Natural Honey', 2, TRUE),
  ('قهوة عربية', 'Arabic Coffee', 3, TRUE),
  ('توابل وبهارات', 'Spices & Herbs', 4, TRUE),
  ('منتجات ألبان', 'Dairy Products', 5, TRUE)
ON CONFLICT DO NOTHING;




-- ========== 020_create_banners.sql ==========
-- 020_create_banners.sql
CREATE TABLE public.banners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar        TEXT NOT NULL,
  title_en        TEXT,
  subtitle_ar     TEXT,
  subtitle_en     TEXT,
  label_ar        TEXT,
  label_en        TEXT,
  button_text_ar  TEXT,
  button_text_en  TEXT,
  emoji           TEXT DEFAULT '🥘',
  image_url       TEXT,
  bg_color        TEXT NOT NULL DEFAULT '#1e1a17',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Anyone can read active banners
CREATE POLICY "public read banners"
  ON public.banners FOR SELECT
  USING (true);

-- Only admins can insert / update / delete
CREATE POLICY "admin insert banners"
  ON public.banners FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

CREATE POLICY "admin update banners"
  ON public.banners FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

CREATE POLICY "admin delete banners"
  ON public.banners FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );
