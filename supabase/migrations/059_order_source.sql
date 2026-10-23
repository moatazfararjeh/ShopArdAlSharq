-- 059_order_source.sql  (orders + sign-ups)
--
-- Record where each order was placed: the website or the iPhone / Android
-- app, and which app version. Orders placed before this (and from app
-- versions that don't send it) stay NULL = unknown.
--
-- place_order gets two optional parameters. The old 3-parameter version is
-- dropped so PostgREST has a single function to call; older apps that send
-- only the first three arguments still work through the defaults.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source      TEXT CHECK (source IN ('web', 'ios', 'android')),
  ADD COLUMN IF NOT EXISTS app_version TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);

DROP FUNCTION IF EXISTS place_order(UUID, payment_method, TEXT);

CREATE OR REPLACE FUNCTION place_order(
  p_address_id     UUID,
  p_payment_method payment_method DEFAULT 'cash_on_delivery',
  p_notes          TEXT DEFAULT NULL,
  p_source         TEXT DEFAULT NULL,
  p_app_version    TEXT DEFAULT NULL
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

  INSERT INTO orders (user_id, status, total_amount, delivery_address, payment_method, notes, source, app_version)
  VALUES (v_user_id, 'pending', v_total, v_address, p_payment_method, p_notes,
          CASE WHEN p_source IN ('web', 'ios', 'android') THEN p_source END,
          LEFT(NULLIF(TRIM(p_app_version), ''), 40))
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

GRANT EXECUTE ON FUNCTION place_order(UUID, payment_method, TEXT, TEXT, TEXT) TO authenticated;

-- ─── Where each customer signed up ───────────────────────────────────────────
-- The app sends signup_source / signup_app_version in the sign-up metadata;
-- the profile trigger copies them. Accounts created before this stay NULL.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS signup_source      TEXT CHECK (signup_source IN ('web', 'ios', 'android')),
  ADD COLUMN IF NOT EXISTS signup_app_version TEXT;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, phone, signup_source, signup_app_version)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    CASE WHEN NEW.raw_user_meta_data->>'signup_source' IN ('web', 'ios', 'android')
         THEN NEW.raw_user_meta_data->>'signup_source' END,
    LEFT(NULLIF(TRIM(NEW.raw_user_meta_data->>'signup_app_version'), ''), 40)
  );
  RETURN NEW;
END;
$$;
