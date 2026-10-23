-- 057_product_units.sql
--
-- Per-unit pricing. Until now a product had one base `price` + one
-- `discount_price`, plus loose price_per_piece / _kg / _carton columns; any
-- discount was spread over the units by ratio, so an admin could not say
-- "carton 10.000 → 9.000, piece stays 1.000". Orders also never recorded
-- which unit was bought.
--
-- New model: one row per sellable unit in `product_units`, each with its own
-- price, optional sale price (+ optional end date), minimum quantity and
-- content (pieces per carton). `product_units` is the source of truth.
--
-- Compatibility: the old product columns (price, discount_price,
-- flash_sale_*, price_per_*, pieces_per_carton, unit_type, min_order_*) are
-- kept and filled from the units by a trigger, so listings, sorting, SEO and
-- older app versions keep working unchanged.
--
-- Stock is unchanged: still one stock_quantity per product, decremented by
-- the ordered quantity.

-- ─── Table ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_units (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit             TEXT NOT NULL CHECK (unit IN ('piece', 'kg', 'carton', 'tin')),
  price            NUMERIC(10,3) NOT NULL CHECK (price > 0),
  sale_price       NUMERIC(10,3) CHECK (sale_price > 0),
  sale_ends_at     TIMESTAMPTZ,
  min_qty          INT NOT NULL DEFAULT 1 CHECK (min_qty >= 1),
  pieces_per_unit  INT CHECK (pieces_per_unit >= 1),
  is_default       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, unit),
  CONSTRAINT product_units_sale_below_price CHECK (sale_price IS NULL OR sale_price < price)
);

CREATE INDEX IF NOT EXISTS idx_product_units_product_id ON product_units(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_units_one_default
  ON product_units(product_id) WHERE is_default;

ALTER TABLE product_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read product units" ON product_units;
CREATE POLICY "Anyone can read product units" ON product_units
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins manage product units" ON product_units;
CREATE POLICY "Admins manage product units" ON product_units
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ─── Helpers ─────────────────────────────────────────────────────────────────
-- Price a customer pays for one unit right now.
CREATE OR REPLACE FUNCTION product_unit_effective_price(u product_units)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN u.sale_price IS NOT NULL AND (u.sale_ends_at IS NULL OR u.sale_ends_at > NOW())
      THEN u.sale_price
    ELSE u.price
  END;
$$;

CREATE OR REPLACE FUNCTION product_unit_label(p_unit TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_unit
    WHEN 'piece'  THEN 'حبة'
    WHEN 'kg'     THEN 'كيلو'
    WHEN 'carton' THEN 'كرتون'
    WHEN 'tin'    THEN 'تنك'
    ELSE COALESCE(p_unit, '')
  END;
$$;

-- Copy the default unit (and the per-unit prices) onto the legacy product
-- columns. Does nothing while a product has no units (e.g. mid-replace).
CREATE OR REPLACE FUNCTION sync_product_price_summary(p_product_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  d         product_units;
  v_sale    NUMERIC;
  v_price   NUMERIC(10,2);
BEGIN
  SELECT * INTO d FROM product_units
  WHERE product_id = p_product_id
  ORDER BY is_default DESC, sort_order, created_at
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_price := ROUND(d.price, 2);
  v_sale  := CASE WHEN d.sale_price IS NOT NULL AND ROUND(d.sale_price, 2) < v_price
                  THEN ROUND(d.sale_price, 2) END;

  UPDATE products p SET
    price              = v_price,
    unit_type          = d.unit,
    discount_price     = CASE WHEN d.sale_ends_at IS NULL THEN v_sale END,
    flash_sale_price   = CASE WHEN d.sale_ends_at IS NOT NULL THEN v_sale END,
    flash_sale_ends_at = CASE WHEN d.sale_ends_at IS NOT NULL AND v_sale IS NOT NULL THEN d.sale_ends_at END,
    min_order_quantity = d.min_qty,
    price_per_piece    = (SELECT price FROM product_units WHERE product_id = p.id AND unit = 'piece'),
    price_per_kg       = (SELECT price FROM product_units WHERE product_id = p.id AND unit = 'kg'),
    price_per_carton   = (SELECT price FROM product_units WHERE product_id = p.id AND unit = 'carton'),
    pieces_per_carton  = (SELECT pieces_per_unit FROM product_units WHERE product_id = p.id AND unit = 'carton'),
    min_order_quantity_piece  = (SELECT min_qty FROM product_units WHERE product_id = p.id AND unit = 'piece'),
    min_order_quantity_kg     = (SELECT min_qty FROM product_units WHERE product_id = p.id AND unit = 'kg'),
    min_order_quantity_carton = (SELECT min_qty FROM product_units WHERE product_id = p.id AND unit = 'carton')
  WHERE p.id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION trg_product_units_sync()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'DELETE' THEN
    NEW.updated_at := NOW();
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION trg_product_units_after()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM sync_product_price_summary(COALESCE(NEW.product_id, OLD.product_id));
  RETURN NULL;
END;
$$;

-- ─── Backfill from the old columns ───────────────────────────────────────────
-- One row per filled price_per_* column; products with none get one row from
-- `price` in their unit_type. Any active discount / flash sale becomes the
-- unit's sale price, scaled by the same ratio the app used until now.
INSERT INTO product_units (product_id, unit, price, sale_price, sale_ends_at, min_qty, pieces_per_unit, sort_order)
SELECT src.product_id, src.unit, src.unit_price,
       CASE WHEN src.disc IS NOT NULL AND src.base > 0
                 AND ROUND(src.unit_price * src.disc / src.base, 3) BETWEEN 0.001 AND src.unit_price - 0.001
            THEN ROUND(src.unit_price * src.disc / src.base, 3) END,
       CASE WHEN src.disc IS NOT NULL THEN src.disc_ends END,
       src.min_qty, src.pieces, src.sort_order
FROM (
  SELECT p.id AS product_id, x.unit, x.unit_price, x.min_qty, x.pieces, x.sort_order,
         p.price AS base,
         CASE WHEN p.flash_sale_price IS NOT NULL AND p.flash_sale_ends_at > NOW()
              THEN p.flash_sale_price ELSE p.discount_price END AS disc,
         CASE WHEN p.flash_sale_price IS NOT NULL AND p.flash_sale_ends_at > NOW()
              THEN p.flash_sale_ends_at END AS disc_ends
  FROM products p
  CROSS JOIN LATERAL (
    VALUES
      ('piece',  p.price_per_piece,  COALESCE(p.min_order_quantity_piece,  p.min_order_quantity, 1), NULL::INT,           1),
      ('kg',     p.price_per_kg,     COALESCE(p.min_order_quantity_kg,     p.min_order_quantity, 1), NULL::INT,           2),
      ('carton', p.price_per_carton, COALESCE(p.min_order_quantity_carton, p.min_order_quantity, 1), p.pieces_per_carton, 3)
  ) AS x(unit, unit_price, min_qty, pieces, sort_order)
  WHERE x.unit_price IS NOT NULL AND x.unit_price > 0

  UNION ALL

  SELECT p.id, COALESCE(p.unit_type, 'piece'), p.price, GREATEST(p.min_order_quantity, 1),
         CASE WHEN p.unit_type = 'carton' THEN p.pieces_per_carton END, 0,
         p.price,
         CASE WHEN p.flash_sale_price IS NOT NULL AND p.flash_sale_ends_at > NOW()
              THEN p.flash_sale_price ELSE p.discount_price END,
         CASE WHEN p.flash_sale_price IS NOT NULL AND p.flash_sale_ends_at > NOW()
              THEN p.flash_sale_ends_at END
  FROM products p
  WHERE p.price > 0
    AND COALESCE(p.price_per_piece, 0) <= 0
    AND COALESCE(p.price_per_kg, 0) <= 0
    AND COALESCE(p.price_per_carton, 0) <= 0
) src
WHERE NOT EXISTS (SELECT 1 FROM product_units pu WHERE pu.product_id = src.product_id)
ON CONFLICT (product_id, unit) DO NOTHING;

-- Default unit: the product's unit_type when it has that unit, otherwise the
-- unit whose price equals the base price, otherwise the first one.
UPDATE product_units pu SET is_default = TRUE
FROM (
  SELECT DISTINCT ON (pu2.product_id) pu2.id
  FROM product_units pu2
  JOIN products p ON p.id = pu2.product_id
  WHERE NOT EXISTS (SELECT 1 FROM product_units x WHERE x.product_id = pu2.product_id AND x.is_default)
  ORDER BY pu2.product_id,
           (pu2.unit = p.unit_type) DESC,
           (ROUND(pu2.price, 2) = p.price) DESC,
           pu2.sort_order
) pick
WHERE pu.id = pick.id;

DROP TRIGGER IF EXISTS product_units_set_updated_at ON product_units;
CREATE TRIGGER product_units_set_updated_at
  BEFORE INSERT OR UPDATE ON product_units
  FOR EACH ROW EXECUTE FUNCTION trg_product_units_sync();

DROP TRIGGER IF EXISTS product_units_sync_product ON product_units;
CREATE TRIGGER product_units_sync_product
  AFTER INSERT OR UPDATE OR DELETE ON product_units
  FOR EACH ROW EXECUTE FUNCTION trg_product_units_after();

-- Bring every product's legacy columns in line with its units once.
SELECT sync_product_price_summary(id) FROM products;

-- ─── Admin: replace a product's units in one call ────────────────────────────
-- p_units: [{unit, price, sale_price?, sale_ends_at?, min_qty?, pieces_per_unit?, is_default?}]
CREATE OR REPLACE FUNCTION save_product_units(p_product_id UUID, p_units JSONB)
RETURNS SETOF product_units LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count    INT;
  v_defaults INT;
  v_elem     JSONB;
  v_i        INT := 0;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  v_count := jsonb_array_length(COALESCE(p_units, '[]'::jsonb));
  IF v_count = 0 THEN
    RAISE EXCEPTION 'NO_UNITS';
  END IF;
  SELECT COUNT(*) INTO v_defaults FROM jsonb_array_elements(p_units) e WHERE (e->>'is_default')::BOOLEAN;

  DELETE FROM product_units WHERE product_id = p_product_id;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_units) LOOP
    INSERT INTO product_units (product_id, unit, price, sale_price, sale_ends_at, min_qty, pieces_per_unit, is_default, sort_order)
    VALUES (
      p_product_id,
      v_elem->>'unit',
      (v_elem->>'price')::NUMERIC,
      NULLIF(v_elem->>'sale_price', '')::NUMERIC,
      NULLIF(v_elem->>'sale_ends_at', '')::TIMESTAMPTZ,
      COALESCE(NULLIF(v_elem->>'min_qty', '')::INT, 1),
      NULLIF(v_elem->>'pieces_per_unit', '')::INT,
      -- Exactly one default: the flagged one, or the first unit if none/several are flagged.
      CASE WHEN v_defaults = 1 THEN COALESCE((v_elem->>'is_default')::BOOLEAN, FALSE) ELSE v_i = 0 END,
      v_i
    );
    v_i := v_i + 1;
  END LOOP;

  RETURN QUERY SELECT * FROM product_units WHERE product_id = p_product_id ORDER BY sort_order;
END;
$$;

GRANT EXECUTE ON FUNCTION save_product_units(UUID, JSONB) TO authenticated;

-- ─── Cart + orders remember the unit ─────────────────────────────────────────
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_selected_unit_check;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_selected_unit_check
  CHECK (selected_unit IN ('piece', 'kg', 'carton', 'tin'));

-- A cart holds one line per product *and unit*: 3 pieces and 1 carton of the
-- same product are two lines. Until now the key was (cart, product), so the
-- second unit overwrote the first and checkout charged the wrong total.
-- A line saved without a unit gets the product's default unit, so "no unit"
-- and "default unit" are always the same line.
CREATE OR REPLACE FUNCTION trg_cart_items_default_unit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.selected_unit IS NULL THEN
    SELECT unit INTO NEW.selected_unit FROM product_units
    WHERE product_id = NEW.product_id AND is_default;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cart_items_default_unit ON cart_items;
CREATE TRIGGER cart_items_default_unit
  BEFORE INSERT OR UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION trg_cart_items_default_unit();

UPDATE cart_items SET selected_unit = NULL WHERE selected_unit IS NULL;  -- fills existing lines via the trigger

-- Drop the old (cart, product) key whatever it is named (006 calls it cart_items_unique).
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  FOR v_conname IN
    SELECT con.conname FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'cart_items' AND con.contype = 'u'
      AND (SELECT array_agg(att.attname::TEXT ORDER BY att.attname)
           FROM pg_attribute att
           WHERE att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)) = ARRAY['cart_id', 'product_id']
  LOOP
    EXECUTE format('ALTER TABLE cart_items DROP CONSTRAINT %I', v_conname);
  END LOOP;
END $$;

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_unit_unique;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_unit_unique UNIQUE (cart_id, product_id, selected_unit);

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS unit            TEXT,
  ADD COLUMN IF NOT EXISTS pieces_per_unit INT;

-- Dinar prices have three decimals (fils); 2.950 was being stored as 2.95
-- and 2.956 as 2.96. total_price is generated from unit_price, so it has to
-- be dropped and re-added around the type change.
ALTER TABLE order_items DROP COLUMN IF EXISTS total_price;
ALTER TABLE order_items ALTER COLUMN unit_price TYPE NUMERIC(10,3);
ALTER TABLE order_items ADD COLUMN total_price NUMERIC(12,3) GENERATED ALWAYS AS (unit_price * quantity) STORED;
ALTER TABLE orders ALTER COLUMN total_amount TYPE NUMERIC(12,3);

-- ─── place_order: price each line from its unit ──────────────────────────────
CREATE OR REPLACE FUNCTION place_order(
  p_address_id     UUID,
  p_payment_method payment_method DEFAULT 'cash_on_delivery',
  p_notes          TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id      UUID := auth.uid();
  v_cart_id      UUID;
  v_order_id     UUID;
  v_order_number TEXT;
  v_total        NUMERIC(12,3) := 0;
  v_address      JSONB;
  v_item         RECORD;
  v_stock_after  INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT id INTO v_cart_id FROM carts WHERE user_id = v_user_id;
  IF v_cart_id IS NULL OR NOT EXISTS (SELECT 1 FROM cart_items WHERE cart_id = v_cart_id) THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  SELECT to_jsonb(a.*) INTO v_address
  FROM addresses a
  WHERE a.id = p_address_id AND a.user_id = v_user_id;
  IF v_address IS NULL THEN
    RAISE EXCEPTION 'INVALID_ADDRESS';
  END IF;

  -- Lock the products first so stock checks and decrements can't race.
  PERFORM 1 FROM products p JOIN cart_items ci ON ci.product_id = p.id
  WHERE ci.cart_id = v_cart_id FOR UPDATE OF p;

  CREATE TEMP TABLE _order_lines ON COMMIT DROP AS
  SELECT ci.quantity,
         p.id AS product_id, p.name_ar, p.name_en, p.stock_quantity, p.is_available,
         ci.selected_unit,
         u.unit, u.pieces_per_unit, u.min_qty,
         product_unit_effective_price(u) AS unit_price
  FROM cart_items ci
  JOIN products p ON p.id = ci.product_id
  LEFT JOIN LATERAL (
    -- The unit the customer picked; with no pick (older carts), the default.
    SELECT pu.* FROM product_units pu
    WHERE pu.product_id = p.id
      AND (pu.unit = ci.selected_unit OR (ci.selected_unit IS NULL AND pu.is_default))
    LIMIT 1
  ) u ON TRUE
  WHERE ci.cart_id = v_cart_id;

  FOR v_item IN SELECT * FROM _order_lines LOOP
    IF NOT v_item.is_available THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE:%', v_item.name_ar;
    END IF;
    IF v_item.unit IS NULL THEN
      RAISE EXCEPTION 'UNIT_UNAVAILABLE:% (%)', v_item.name_ar, product_unit_label(v_item.selected_unit);
    END IF;
    IF v_item.quantity < v_item.min_qty THEN
      RAISE EXCEPTION 'BELOW_MIN_QUANTITY:% (%)', v_item.name_ar, v_item.min_qty;
    END IF;
    IF v_item.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:% (%)', v_item.name_ar, v_item.product_id;
    END IF;
    v_total := v_total + v_item.unit_price * v_item.quantity;
  END LOOP;

  INSERT INTO orders (user_id, status, total_amount, delivery_address, payment_method, notes)
  VALUES (v_user_id, 'pending', v_total, v_address, p_payment_method, p_notes)
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT * FROM _order_lines LOOP
    INSERT INTO order_items (order_id, product_id, product_name_ar, product_name_en, unit_price, quantity, unit, pieces_per_unit)
    VALUES (v_order_id, v_item.product_id, v_item.name_ar, v_item.name_en, v_item.unit_price, v_item.quantity, v_item.unit, v_item.pieces_per_unit);

    UPDATE products SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id
    RETURNING stock_quantity INTO v_stock_after;

    INSERT INTO inventory_logs (product_id, action, quantity_change, quantity_before, quantity_after, reference_id)
    VALUES (v_item.product_id, 'sale', -v_item.quantity, v_stock_after + v_item.quantity, v_stock_after, v_order_id);
  END LOOP;

  DELETE FROM cart_items WHERE cart_id = v_cart_id;
  INSERT INTO order_status_history (order_id, status) VALUES (v_order_id, 'pending');

  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number, 'total_amount', v_total);
END;
$$;

-- ─── admin_update_order_items: lines are (product, unit) ─────────────────────
-- p_items: [{product_id, unit?, quantity}]. Items without "unit" (older admin
-- screens) match the product's existing line whatever its unit, and new lines
-- without a unit use the product's default unit.
CREATE OR REPLACE FUNCTION admin_update_order_items(
  p_order_id UUID,
  p_items    JSONB,
  p_note     TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order        RECORD;
  v_line         RECORD;
  v_requested    RECORD;
  v_product      RECORD;
  v_unit         product_units;
  v_new_qty      INT;
  v_delta        INT;
  v_stock_before INT;
  v_total        NUMERIC(12,3);
  v_changes      TEXT[] := ARRAY[]::TEXT[];
  v_title        TEXT;
  v_body         TEXT;
  v_token        TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT id, user_id, order_number, status INTO v_order
  FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;
  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'ORDER_NOT_EDITABLE';
  END IF;

  -- Existing lines: change quantity or remove.
  FOR v_line IN
    SELECT id, product_id, product_name_ar, quantity, unit
    FROM order_items
    WHERE order_id = p_order_id AND product_id IS NOT NULL
  LOOP
    SELECT COALESCE(MAX((elem->>'quantity')::INT), 0) INTO v_new_qty
    FROM jsonb_array_elements(p_items) elem
    WHERE (elem->>'product_id')::UUID = v_line.product_id
      AND (NOT (elem ? 'unit') OR (elem->>'unit') IS NOT DISTINCT FROM v_line.unit);

    CONTINUE WHEN v_new_qty = v_line.quantity;
    v_delta := v_new_qty - v_line.quantity;

    SELECT stock_quantity INTO v_stock_before
    FROM products WHERE id = v_line.product_id FOR UPDATE;
    IF v_delta > 0 AND v_stock_before < v_delta THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%|%', v_line.product_name_ar, v_stock_before;
    END IF;

    UPDATE products SET stock_quantity = stock_quantity - v_delta WHERE id = v_line.product_id;

    INSERT INTO inventory_logs (product_id, action, quantity_change, quantity_before, quantity_after, reference_id, note, performed_by)
    VALUES (
      v_line.product_id,
      (CASE WHEN v_delta > 0 THEN 'sale' ELSE 'return' END)::inventory_action,
      -v_delta, v_stock_before, v_stock_before - v_delta,
      p_order_id, 'تعديل طلب من الإدارة', auth.uid()
    );

    IF v_new_qty = 0 THEN
      DELETE FROM order_items WHERE id = v_line.id;
      v_changes := array_append(v_changes, 'حذف ' || v_line.product_name_ar);
    ELSE
      UPDATE order_items SET quantity = v_new_qty WHERE id = v_line.id;
      v_changes := array_append(v_changes,
        v_line.product_name_ar || ': ' || v_line.quantity || ' ← ' || v_new_qty
        || COALESCE(' ' || product_unit_label(v_line.unit), ''));
    END IF;
  END LOOP;

  -- New lines.
  FOR v_requested IN
    SELECT (elem->>'product_id')::UUID AS product_id,
           NULLIF(elem->>'unit', '') AS unit,
           (elem->>'quantity')::INT AS quantity
    FROM jsonb_array_elements(p_items) elem
  LOOP
    CONTINUE WHEN v_requested.quantity IS NULL OR v_requested.quantity <= 0;
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM order_items
      WHERE order_id = p_order_id AND product_id = v_requested.product_id
        AND (v_requested.unit IS NULL OR unit IS NOT DISTINCT FROM v_requested.unit)
    );

    SELECT id, name_ar, name_en, stock_quantity, is_available INTO v_product
    FROM products WHERE id = v_requested.product_id FOR UPDATE;
    IF NOT FOUND OR NOT v_product.is_available THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE:%', v_requested.product_id;
    END IF;

    SELECT * INTO v_unit FROM product_units
    WHERE product_id = v_product.id
      AND (unit = v_requested.unit OR (v_requested.unit IS NULL AND is_default))
    LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'UNIT_UNAVAILABLE:% (%)', v_product.name_ar, product_unit_label(v_requested.unit);
    END IF;

    IF v_product.stock_quantity < v_requested.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%|%', v_product.name_ar, v_product.stock_quantity;
    END IF;

    UPDATE products SET stock_quantity = stock_quantity - v_requested.quantity WHERE id = v_product.id;

    INSERT INTO inventory_logs (product_id, action, quantity_change, quantity_before, quantity_after, reference_id, note, performed_by)
    VALUES (
      v_product.id, 'sale', -v_requested.quantity,
      v_product.stock_quantity, v_product.stock_quantity - v_requested.quantity,
      p_order_id, 'إضافة منتج من الإدارة', auth.uid()
    );

    INSERT INTO order_items (order_id, product_id, product_name_ar, product_name_en, unit_price, quantity, unit, pieces_per_unit)
    VALUES (p_order_id, v_product.id, v_product.name_ar, v_product.name_en,
            product_unit_effective_price(v_unit), v_requested.quantity, v_unit.unit, v_unit.pieces_per_unit);

    v_changes := array_append(v_changes,
      'إضافة ' || v_product.name_ar || ' × ' || v_requested.quantity || ' ' || product_unit_label(v_unit.unit));
  END LOOP;

  IF array_length(v_changes, 1) IS NULL THEN
    RETURN jsonb_build_object('changed', false);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'EMPTY_ORDER';
  END IF;

  SELECT COALESCE(SUM(unit_price * quantity), 0) INTO v_total
  FROM order_items WHERE order_id = p_order_id;

  UPDATE orders SET total_amount = v_total WHERE id = p_order_id;

  v_title := '✏️ تم تعديل طلبك #' || v_order.order_number;
  v_body := array_to_string(v_changes, '، ') || '. الإجمالي الجديد: ' || TO_CHAR(v_total, 'FM999990.000') || ' د.أ';
  IF NULLIF(TRIM(COALESCE(p_note, '')), '') IS NOT NULL THEN
    v_body := v_body || ' — ملاحظة: ' || TRIM(p_note);
  END IF;

  BEGIN
    INSERT INTO notifications (user_id, title_ar, title_en, body_ar, body_en, type, data)
    VALUES (
      v_order.user_id, v_title, '✏️ Order #' || v_order.order_number || ' updated',
      v_body, 'Your order was updated, please review the details.', 'order_update',
      jsonb_build_object('orderId', p_order_id, 'orderNumber', v_order.order_number)
    );

    SELECT expo_push_token INTO v_token FROM profiles WHERE id = v_order.user_id;
    IF v_token ~ '^ExponentPushToken\[.+\]$' THEN
      PERFORM net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_array(jsonb_build_object(
          'to', v_token, 'title', v_title, 'body', v_body, 'sound', 'default',
          'data', jsonb_build_object('orderId', p_order_id, 'orderNumber', v_order.order_number)
        ))
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_update_order_items: customer notification failed for order %: %', v_order.order_number, SQLERRM;
  END;

  RETURN jsonb_build_object('changed', true, 'total', v_total, 'changes', to_jsonb(v_changes));
END;
$$;
