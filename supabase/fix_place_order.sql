-- Fix place_order function:
-- 1. Return order_number in the result JSON
-- 2. Grant execute permission to authenticated users

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

-- Grant execute to authenticated users (was missing — caused "permission denied" errors)
GRANT EXECUTE ON FUNCTION public.place_order(UUID, payment_method, TEXT) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- Fix duplicate default address constraint
-- Trigger clears the old default before a new one is inserted/updated,
-- so idx_addresses_default (unique partial index) is never violated.
-- ──────────────────────────────────────────────────────────────────────────────
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

DROP TRIGGER IF EXISTS trg_unset_other_default_address ON addresses;
CREATE TRIGGER trg_unset_other_default_address
  BEFORE INSERT OR UPDATE OF is_default ON addresses
  FOR EACH ROW EXECUTE FUNCTION unset_other_default_address();
