DROP TRIGGER IF EXISTS trg_notify_admins_new_order ON orders;
DROP FUNCTION IF EXISTS notify_admins_new_order();

CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin       RECORD;
  v_customer    RECORD;
  v_secret      TEXT := current_setting('app.notify_secret', true);
  v_total       TEXT := TO_CHAR(NEW.total_amount, 'FM999990.000');
  v_admin_title TEXT := '🛒 طلب جديد #' || NEW.order_number;
  v_admin_en    TEXT := '🛒 New Order #' || NEW.order_number;
  v_admin_body  TEXT := 'تم استلام طلب جديد بقيمة ' || v_total || ' د.أ — يتطلب إجراءك.';
  v_admin_body_en TEXT := 'A new order worth ' || v_total || ' JOD has been received — action required.';
  v_cust_title  TEXT := '✅ تم استلام طلبك #' || NEW.order_number;
  v_cust_en     TEXT := '✅ Order Received #' || NEW.order_number;
  v_cust_body   TEXT := 'طلبك بقيمة ' || v_total || ' د.أ تحت المراجعة، سنقوم بتأكيده قريباً.';
  v_cust_body_en TEXT := 'Your order worth ' || v_total || ' JOD is under review, we will confirm it shortly.';
  v_messages    JSONB := '[]'::jsonb;
  v_data        JSONB := jsonb_build_object('orderId', NEW.id, 'orderNumber', NEW.order_number);
BEGIN
  BEGIN
    INSERT INTO notifications (user_id, title_ar, title_en, body_ar, body_en, type, data)
    VALUES (NEW.user_id, v_cust_title, v_cust_en, v_cust_body, v_cust_body_en, 'order_placed', v_data);

    SELECT expo_push_token INTO v_customer FROM profiles WHERE id = NEW.user_id;
    IF FOUND AND v_customer.expo_push_token ~ '^ExponentPushToken\[.+\]$' THEN
      v_messages := v_messages || jsonb_build_array(jsonb_build_object(
        'to', v_customer.expo_push_token, 'title', v_cust_title, 'body', v_cust_body,
        'sound', 'default', 'data', v_data
      ));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_order: customer notification failed for order %: %', NEW.order_number, SQLERRM;
  END;

  BEGIN
    FOR v_admin IN
      SELECT id, expo_push_token FROM profiles WHERE role IN ('admin', 'super_admin')
    LOOP
      INSERT INTO notifications (user_id, title_ar, title_en, body_ar, body_en, type, data)
      VALUES (v_admin.id, v_admin_title, v_admin_en, v_admin_body, v_admin_body_en, 'order_placed',
              v_data || '{"isAdminOrder": true}'::jsonb);

      IF v_admin.expo_push_token IS NOT NULL AND v_admin.expo_push_token ~ '^ExponentPushToken\[.+\]$' THEN
        v_messages := v_messages || jsonb_build_array(jsonb_build_object(
          'to', v_admin.expo_push_token, 'title', v_admin_title, 'body', v_admin_body,
          'sound', 'default', 'data', v_data || '{"isAdminOrder": true}'::jsonb
        ));
      END IF;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_order: admin notification failed for order %: %', NEW.order_number, SQLERRM;
  END;

  BEGIN
    IF jsonb_array_length(v_messages) > 0 THEN
      PERFORM net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := v_messages
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_order: push failed for order %: %', NEW.order_number, SQLERRM;
  END;

  BEGIN
    IF v_secret IS NOT NULL AND v_secret <> '' THEN
      PERFORM net.http_post(
        url := 'https://supabasemobile.ardalsharq.com/functions/v1/notify-new-order',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
        body := jsonb_build_object('orderId', NEW.id)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_order: WhatsApp call failed for order %: %', NEW.order_number, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_order
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_new_order();
