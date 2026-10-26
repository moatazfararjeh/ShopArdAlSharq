-- 062_push_delivery_tracking.sql
--
-- Track whether each push notification reached the customer's phone, not
-- only whether it was opened (read_at, 041) — and send admin pushes from the
-- database instead of the browser.
--
-- Why from the database: Expo's push API sends no CORS headers, so a browser
-- (the admin panel on the website) can't call it — pushes sent from the web
-- admin were blocked. The database has no such limit, and it gets Expo's
-- answer (the "ticket") straight away through the `http` extension.
--
-- notifications.push_status:
--   no_token   the customer has no push token (never allowed notifications,
--              or only uses the website) — nothing was sent
--   sent       Expo accepted it (push_ticket_id); waiting for the receipt
--   delivered  Expo's receipt: Apple / Google accepted it for the device
--   failed     refused or undeliverable (push_error), e.g.
--              DeviceNotRegistered = app uninstalled → the token is cleared
--
-- "delivered" is as far as anyone can see without code on the phone: Apple /
-- Google don't report the moment a notification shows on the screen.

CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS push_status     TEXT CHECK (push_status IN ('no_token', 'sent', 'delivered', 'failed')),
  ADD COLUMN IF NOT EXISTS push_ticket_id  TEXT,
  ADD COLUMN IF NOT EXISTS push_error      TEXT,
  ADD COLUMN IF NOT EXISTS push_token      TEXT,
  ADD COLUMN IF NOT EXISTS push_checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_push_pending
  ON notifications(created_at) WHERE push_status = 'sent';

-- A failed push: save the reason; an uninstalled app also loses its token
-- (only if it's still the token we used — the customer may have a new one).
CREATE OR REPLACE FUNCTION public.mark_push_failed(p_id UUID, p_error TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
  v_token   TEXT;
BEGIN
  UPDATE notifications
  SET push_status = 'failed', push_error = LEFT(COALESCE(p_error, 'Unknown'), 200), push_checked_at = NOW()
  WHERE id = p_id
  RETURNING user_id, push_token INTO v_user_id, v_token;

  IF p_error = 'DeviceNotRegistered' AND v_token IS NOT NULL THEN
    UPDATE profiles SET expo_push_token = NULL WHERE id = v_user_id AND expo_push_token = v_token;
  END IF;
END;
$$;

-- Send the push for these notification rows (title_ar / body_ar / data) and
-- record the outcome. Admin only. Returns {"sent", "failed", "no_token"}.
CREATE OR REPLACE FUNCTION public.send_push_notifications(p_ids UUID[])
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_batch    JSONB;
  v_ids      UUID[];
  v_tokens   TEXT[];
  v_resp     RECORD;
  v_tickets  JSONB;
  v_ticket   JSONB;
  v_i        INT;
  v_sent     INT := 0;
  v_failed   INT := 0;
  v_no_token INT := 0;
  v_error    TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- No usable token: record it and skip.
  WITH upd AS (
    UPDATE notifications n
    SET push_status = 'no_token', push_checked_at = NOW()
    FROM profiles p
    WHERE n.id = ANY(p_ids) AND p.id = n.user_id
      AND (p.expo_push_token IS NULL OR p.expo_push_token !~ '^ExponentPushToken\[.+\]$')
    RETURNING 1
  ) SELECT COUNT(*) INTO v_no_token FROM upd;

  -- Expo takes up to 100 messages per request.
  FOR v_batch, v_ids, v_tokens IN
    SELECT jsonb_agg(jsonb_build_object(
             'to', p.expo_push_token, 'title', n.title_ar, 'body', n.body_ar, 'sound', 'default',
             'data', COALESCE(n.data, '{}'::jsonb) || jsonb_build_object('notificationId', n.id)) ORDER BY n.id),
           array_agg(n.id ORDER BY n.id),
           array_agg(p.expo_push_token ORDER BY n.id)
    FROM (
      SELECT n.*, (ROW_NUMBER() OVER (ORDER BY n.id) - 1) / 100 AS chunk
      FROM notifications n WHERE n.id = ANY(p_ids)
    ) n
    JOIN profiles p ON p.id = n.user_id
    WHERE p.expo_push_token ~ '^ExponentPushToken\[.+\]$'
    GROUP BY n.chunk
  LOOP
    UPDATE notifications SET push_token = v_tokens[i.idx]
    FROM generate_subscripts(v_ids, 1) AS i(idx) WHERE id = v_ids[i.idx];

    BEGIN
      SELECT status, content INTO v_resp
      FROM http_post('https://exp.host/--/api/v2/push/send', v_batch::TEXT, 'application/json');
      v_tickets := CASE WHEN v_resp.status = 200 THEN (v_resp.content::JSONB)->'data' END;
      v_error := 'HTTP ' || v_resp.status;
    EXCEPTION WHEN OTHERS THEN
      v_tickets := NULL;
      v_error := 'NetworkError';
    END;

    FOR v_i IN 1 .. array_length(v_ids, 1) LOOP
      v_ticket := v_tickets -> (v_i - 1);
      IF v_ticket ->> 'status' = 'ok' THEN
        UPDATE notifications
        SET push_status = 'sent', push_ticket_id = v_ticket ->> 'id', push_error = NULL, push_checked_at = NOW()
        WHERE id = v_ids[v_i];
        v_sent := v_sent + 1;
      ELSE
        PERFORM mark_push_failed(v_ids[v_i], COALESCE(v_ticket -> 'details' ->> 'error', v_ticket ->> 'message', v_error));
        v_failed := v_failed + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('sent', v_sent, 'failed', v_failed, 'no_token', v_no_token);
END;
$$;

-- Turn "sent" into delivered / failed from Expo's receipts (Expo keeps them
-- about a day). Admin only; the stats screen calls it. Returns rows updated.
CREATE OR REPLACE FUNCTION public.check_push_receipts()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_ids      UUID[];
  v_tickets  TEXT[];
  v_resp     RECORD;
  v_receipts JSONB;
  v_receipt  JSONB;
  v_i        INT;
  v_count    INT := 0;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  FOR v_ids, v_tickets IN
    SELECT array_agg(id ORDER BY created_at), array_agg(push_ticket_id ORDER BY created_at)
    FROM (
      SELECT id, push_ticket_id, created_at, (ROW_NUMBER() OVER (ORDER BY created_at) - 1) / 1000 AS chunk
      FROM notifications
      WHERE push_status = 'sent' AND push_ticket_id IS NOT NULL AND created_at > NOW() - INTERVAL '2 days'
      LIMIT 5000
    ) s
    GROUP BY chunk
  LOOP
    BEGIN
      SELECT status, content INTO v_resp
      FROM http_post('https://exp.host/--/api/v2/push/getReceipts',
                                jsonb_build_object('ids', to_jsonb(v_tickets))::TEXT, 'application/json');
      v_receipts := CASE WHEN v_resp.status = 200 THEN (v_resp.content::JSONB)->'data' END;
    EXCEPTION WHEN OTHERS THEN
      v_receipts := NULL;   -- try again next time
    END;
    CONTINUE WHEN v_receipts IS NULL;

    FOR v_i IN 1 .. array_length(v_ids, 1) LOOP
      v_receipt := v_receipts -> v_tickets[v_i];
      CONTINUE WHEN v_receipt IS NULL;   -- not ready yet
      IF v_receipt ->> 'status' = 'ok' THEN
        UPDATE notifications SET push_status = 'delivered', push_checked_at = NOW() WHERE id = v_ids[v_i];
      ELSE
        PERFORM mark_push_failed(v_ids[v_i], COALESCE(v_receipt -> 'details' ->> 'error', v_receipt ->> 'message'));
      END IF;
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_push_failed(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_push_notifications(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_push_receipts() TO authenticated;

-- Campaign stats: delivery counts next to the open count (new columns at the end).
CREATE OR REPLACE VIEW promo_campaign_stats AS
SELECT
  campaign_id,
  title_ar,
  body_ar,
  MIN(created_at)                                         AS sent_at,
  COUNT(*)                                                AS sent_count,
  COUNT(*) FILTER (WHERE is_read = TRUE)                  AS read_count,
  COUNT(*) FILTER (WHERE push_status = 'delivered')       AS delivered_count,
  COUNT(*) FILTER (WHERE push_status = 'sent')            AS pending_count,
  COUNT(*) FILTER (WHERE push_status = 'failed')          AS failed_count,
  COUNT(*) FILTER (WHERE push_status = 'no_token')        AS no_token_count,
  COUNT(*) FILTER (WHERE push_status IS NULL)             AS untracked_count
FROM notifications
WHERE type = 'promo' AND campaign_id IS NOT NULL
GROUP BY campaign_id, title_ar, body_ar
ORDER BY MIN(created_at) DESC;
