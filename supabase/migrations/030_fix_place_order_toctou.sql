-- 030_fix_place_order_toctou.sql
-- SECURITY FIX: TOCTOU (time-of-check / time-of-use) race condition in place_order.
-- The original function checked stock availability in one FOR loop and decremented
-- it in a second, separate loop.  Between the two loops a concurrent call could also
-- pass the check, causing both to decrement and resulting in negative stock.
--
-- Fix: merge both loops into a single pass that locks each product row with
-- SELECT ... FOR UPDATE before checking and decrementing, eliminating the race.

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
  v_total         NUMERIC(10,2) := 0;
  v_address       JSONB;
  v_item          RECORD;
  v_stock_before  INT;
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

  -- -----------------------------------------------------------------------
  -- Single pass: lock each product row FOR UPDATE, validate stock, accumulate
  -- total.  Locking here prevents any concurrent place_order from reading a
  -- stale stock_quantity until this transaction commits or rolls back.
  -- -----------------------------------------------------------------------
  FOR v_item IN
    SELECT ci.quantity,
           p.id            AS product_id,
           p.name_ar,
           p.name_en,
           COALESCE(p.discount_price, p.price) AS unit_price,
           p.stock_quantity
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart_id AND p.is_available = TRUE
    FOR UPDATE OF p          -- lock product rows to prevent concurrent stock races
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

  -- Insert order items, decrement stock, and log inventory — all in the same
  -- locked transaction so no concurrent order can interleave.
  FOR v_item IN
    SELECT ci.quantity,
           p.id   AS product_id,
           p.name_ar,
           p.name_en,
           COALESCE(p.discount_price, p.price) AS unit_price
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart_id
  LOOP
    INSERT INTO order_items (order_id, product_id, product_name_ar, product_name_en, unit_price, quantity)
    VALUES (v_order_id, v_item.product_id, v_item.name_ar, v_item.name_en, v_item.unit_price, v_item.quantity);

    UPDATE products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id
    RETURNING stock_quantity INTO v_stock_before;   -- stock_quantity after decrement

    -- Log inventory change
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

  -- Clear cart
  DELETE FROM cart_items WHERE cart_id = v_cart_id;

  -- Record initial status history
  INSERT INTO order_status_history (order_id, status) VALUES (v_order_id, 'pending');

  RETURN jsonb_build_object('order_id', v_order_id, 'total_amount', v_total);
END;
$$;
