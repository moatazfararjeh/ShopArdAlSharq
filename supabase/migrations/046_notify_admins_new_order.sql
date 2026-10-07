CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_admins_new_order()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin     RECORD;
  v_title_ar  TEXT := '🛒 طلب جديد #' || NEW.order_number;
  v_title_en  TEXT := '🛒 New Order #' || NEW.order_number;
  v_body_ar   TEXT;
  v_body_en   TEXT;
  v_messages  JSONB := '[]'::jsonb;
BEGIN
  v_body_ar := 'تم استلام طلب جديد بقيمة ' || TO_CHAR(NEW.total_amount, 'FM999990.000') || ' د.أ — يتطلب إجراءك.';
  v_body_en := 'A new order worth ' || TO_CHAR(NEW.total_amount, 'FM999990.000') || ' JOD has been received — action required.';

  BEGIN
    FOR v_admin IN
      SELECT id, expo_push_token FROM profiles WHERE role IN ('admin', 'super_admin')
    LOOP
      INSERT INTO notifications (user_id, title_ar, title_en, body_ar, body_en, type, data)
      VALUES (
        v_admin.id, v_title_ar, v_title_en, v_body_ar, v_body_en, 'order_placed',
        jsonb_build_object('orderId', NEW.id, 'orderNumber', NEW.order_number)
      );

      IF v_admin.expo_push_token IS NOT NULL AND v_admin.expo_push_token ~ '^ExponentPushToken\[.+\]$' THEN
        v_messages := v_messages || jsonb_build_array(jsonb_build_object(
          'to', v_admin.expo_push_token,
          'title', v_title_ar,
          'body', v_body_ar,
          'sound', 'default',
          'data', jsonb_build_object('orderId', NEW.id, 'orderNumber', NEW.order_number, 'isAdminOrder', true)
        ));
      END IF;
    END LOOP;

    IF jsonb_array_length(v_messages) > 0 THEN
      PERFORM net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := v_messages
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_admins_new_order failed for order %: %', NEW.order_number, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_order ON orders;
CREATE TRIGGER trg_notify_admins_new_order
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_admins_new_order();
