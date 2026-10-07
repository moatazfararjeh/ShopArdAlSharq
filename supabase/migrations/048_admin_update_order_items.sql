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
  v_new_qty      INT;
  v_delta        INT;
  v_stock_before INT;
  v_total        NUMERIC(10,2);
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

  FOR v_line IN
    SELECT id, product_id, product_name_ar, quantity
    FROM order_items
    WHERE order_id = p_order_id AND product_id IS NOT NULL
  LOOP
    SELECT COALESCE(MAX((elem->>'quantity')::INT), 0) INTO v_new_qty
    FROM jsonb_array_elements(p_items) elem
    WHERE (elem->>'product_id')::UUID = v_line.product_id;

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
      -v_delta,
      v_stock_before,
      v_stock_before - v_delta,
      p_order_id,
      'تعديل طلب من الإدارة',
      auth.uid()
    );

    IF v_new_qty = 0 THEN
      DELETE FROM order_items WHERE id = v_line.id;
      v_changes := array_append(v_changes, 'حذف ' || v_line.product_name_ar);
    ELSE
      UPDATE order_items SET quantity = v_new_qty WHERE id = v_line.id;
      v_changes := array_append(v_changes, v_line.product_name_ar || ': ' || v_line.quantity || ' ← ' || v_new_qty);
    END IF;
  END LOOP;

  FOR v_requested IN
    SELECT (elem->>'product_id')::UUID AS product_id, (elem->>'quantity')::INT AS quantity
    FROM jsonb_array_elements(p_items) elem
  LOOP
    CONTINUE WHEN v_requested.quantity IS NULL OR v_requested.quantity <= 0;
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM order_items WHERE order_id = p_order_id AND product_id = v_requested.product_id
    );

    SELECT id, name_ar, name_en, COALESCE(discount_price, price) AS unit_price, stock_quantity, is_available
    INTO v_product
    FROM products WHERE id = v_requested.product_id FOR UPDATE;

    IF NOT FOUND OR NOT v_product.is_available THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE:%', v_requested.product_id;
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

    INSERT INTO order_items (order_id, product_id, product_name_ar, product_name_en, unit_price, quantity)
    VALUES (p_order_id, v_product.id, v_product.name_ar, v_product.name_en, v_product.unit_price, v_requested.quantity);

    v_changes := array_append(v_changes, 'إضافة ' || v_product.name_ar || ' × ' || v_requested.quantity);
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
