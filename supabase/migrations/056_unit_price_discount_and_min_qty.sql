-- 056_unit_price_discount_and_min_qty.sql
--
-- Fixes two bugs in the per-unit pricing system (price_per_piece / price_per_kg /
-- price_per_carton), and adds independent minimum-order-quantities per unit.
--
-- Bug 1: place_order always charged COALESCE(discount_price, price) and
-- completely ignored cart_items.selected_unit — so any product sold by
-- piece/kg/carton was charged at the wrong amount at checkout, and an active
-- discount_price/flash_sale_price was never applied to a unit price at all.
-- This migration makes place_order price each line item from the unit the
-- customer actually selected, with any discount/flash-sale applied
-- proportionally — matching the client-side fix in getEffectiveUnitPrice().
--
-- Bug 2: cart_items.selected_unit's CHECK constraint only ever allowed
-- ('piece', 'carton') — 'kg' was never added even though price_per_kg has
-- existed since migration 022 and the app's unit picker offers it. Adding a
-- kg-priced product to the cart with "kg" selected would fail at the DB.
--
-- New: min_order_quantity_piece / _kg / _carton columns, independent of each
-- other and of the pre-existing min_order_quantity (which remains the
-- minimum for plain, single-price products with no unit selected).

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS min_order_quantity_piece  INT CHECK (min_order_quantity_piece  >= 1),
  ADD COLUMN IF NOT EXISTS min_order_quantity_kg     INT CHECK (min_order_quantity_kg     >= 1),
  ADD COLUMN IF NOT EXISTS min_order_quantity_carton INT CHECK (min_order_quantity_carton >= 1);

-- Replace whatever the selected_unit CHECK constraint is actually named with
-- one that also allows 'kg'.
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  SELECT con.conname INTO v_conname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
  WHERE rel.relname = 'cart_items'
    AND con.contype = 'c'
    AND att.attname = 'selected_unit';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE cart_items DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE cart_items ADD CONSTRAINT cart_items_selected_unit_check
  CHECK (selected_unit IN ('piece', 'kg', 'carton'));

CREATE OR REPLACE FUNCTION place_order(
  p_address_id    UUID,
  p_payment_method payment_method DEFAULT 'cash_on_delivery',
  p_notes         TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_cart_id       UUID;
  v_order_id      UUID;
  v_order_number  TEXT;
  v_total         NUMERIC(10,2) := 0;
  v_address       JSONB;
  v_item          RECORD;
  v_stock_before  INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT id INTO v_cart_id FROM carts WHERE user_id = v_user_id;
  IF v_cart_id IS NULL THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cart_items WHERE cart_id = v_cart_id) THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  SELECT to_jsonb(a.*) INTO v_address
  FROM addresses a
  WHERE a.id = p_address_id AND a.user_id = v_user_id;

  IF v_address IS NULL THEN
    RAISE EXCEPTION 'INVALID_ADDRESS';
  END IF;

  FOR v_item IN
    WITH cart_calc AS (
      SELECT ci.quantity,
             p.id            AS product_id,
             p.name_ar,
             p.name_en,
             p.stock_quantity,
             p.price,
             COALESCE(
               CASE ci.selected_unit
                 WHEN 'piece'  THEN p.price_per_piece
                 WHEN 'kg'     THEN p.price_per_kg
                 WHEN 'carton' THEN p.price_per_carton
               END,
               p.price
             ) AS raw_unit_price,
             CASE
               WHEN p.flash_sale_price IS NOT NULL AND p.flash_sale_ends_at IS NOT NULL
                    AND p.flash_sale_ends_at > NOW()
                 THEN p.flash_sale_price
               ELSE p.discount_price
             END AS active_discount,
             COALESCE(
               CASE ci.selected_unit
                 WHEN 'piece'  THEN p.min_order_quantity_piece
                 WHEN 'kg'     THEN p.min_order_quantity_kg
                 WHEN 'carton' THEN p.min_order_quantity_carton
               END,
               p.min_order_quantity,
               1
             ) AS effective_min_qty
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = v_cart_id AND p.is_available = TRUE
      FOR UPDATE OF p
    )
    SELECT quantity, product_id, name_ar, stock_quantity, effective_min_qty,
           CASE WHEN active_discount IS NOT NULL AND price > 0
                THEN ROUND(raw_unit_price * (active_discount / price), 2)
                ELSE raw_unit_price
           END AS unit_price
    FROM cart_calc
  LOOP
    IF v_item.quantity < v_item.effective_min_qty THEN
      RAISE EXCEPTION 'BELOW_MIN_QUANTITY:% (%)', v_item.name_ar, v_item.effective_min_qty;
    END IF;
    IF v_item.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:% (%)', v_item.name_ar, v_item.product_id;
    END IF;
    v_total := v_total + (v_item.unit_price * v_item.quantity);
  END LOOP;

  INSERT INTO orders (user_id, status, total_amount, delivery_address, payment_method, notes)
  VALUES (v_user_id, 'pending', v_total, v_address, p_payment_method, p_notes)
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN
    SELECT quantity, product_id, name_ar, name_en,
           CASE WHEN active_discount IS NOT NULL AND price > 0
                THEN ROUND(raw_unit_price * (active_discount / price), 2)
                ELSE raw_unit_price
           END AS unit_price
    FROM (
      SELECT ci.quantity,
             p.id   AS product_id,
             p.name_ar,
             p.name_en,
             p.price,
             COALESCE(
               CASE ci.selected_unit
                 WHEN 'piece'  THEN p.price_per_piece
                 WHEN 'kg'     THEN p.price_per_kg
                 WHEN 'carton' THEN p.price_per_carton
               END,
               p.price
             ) AS raw_unit_price,
             CASE
               WHEN p.flash_sale_price IS NOT NULL AND p.flash_sale_ends_at IS NOT NULL
                    AND p.flash_sale_ends_at > NOW()
                 THEN p.flash_sale_price
               ELSE p.discount_price
             END AS active_discount
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = v_cart_id
    ) sub
  LOOP
    INSERT INTO order_items (order_id, product_id, product_name_ar, product_name_en, unit_price, quantity)
    VALUES (v_order_id, v_item.product_id, v_item.name_ar, v_item.name_en, v_item.unit_price, v_item.quantity);

    UPDATE products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id
    RETURNING stock_quantity INTO v_stock_before;

    INSERT INTO inventory_logs (product_id, action, quantity_change, quantity_before, quantity_after, reference_id)
    VALUES (
      v_item.product_id,
      'sale',
      -v_item.quantity,
      v_stock_before + v_item.quantity,
      v_stock_before,
      v_order_id
    );
  END LOOP;

  DELETE FROM cart_items WHERE cart_id = v_cart_id;

  INSERT INTO order_status_history (order_id, status) VALUES (v_order_id, 'pending');

  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number, 'total_amount', v_total);
END;
$$;
