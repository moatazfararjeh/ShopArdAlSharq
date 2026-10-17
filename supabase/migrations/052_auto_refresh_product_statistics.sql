-- "زوار فريدون" (unique_viewers) always showed 0 on the analytics dashboard.
-- Root cause: record_product_event() only ever incremented the simple
-- counters (views_count, add_to_cart_count, ...) itself. unique_viewers,
-- unique_cart_users, abandoned_cart_users and conversion_rate are only
-- computed by refresh_product_statistics(), which was wired up as a
-- manual "refresh" button on each product's OWN analytics page
-- (app/(admin)/products/[id]/analytics.tsx) — nothing ever called it
-- automatically, so those columns stayed at their default 0 unless an
-- admin opened every single product individually and tapped refresh.
--
-- Fix: have record_product_event() call refresh_product_statistics()
-- itself after every event, so stats are always accurate immediately.
-- refresh_product_statistics() already recomputes every counter from
-- product_events, which made the manual CASE-based increments below
-- redundant (and a potential source of drift) — removed in favor of a
-- single source of truth.
CREATE OR REPLACE FUNCTION record_product_event(
  p_product_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_event_type product_event_type DEFAULT 'view',
  p_session_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO product_events (product_id, user_id, event_type, session_id, metadata)
  VALUES (p_product_id, p_user_id, p_event_type, p_session_id, p_metadata)
  RETURNING id INTO v_event_id;

  INSERT INTO product_statistics (product_id)
  VALUES (p_product_id)
  ON CONFLICT (product_id) DO NOTHING;

  PERFORM refresh_product_statistics(p_product_id);

  RETURN v_event_id;
END;
$$;

-- One-off backfill: bring existing product_statistics rows up to date
-- immediately, instead of waiting for each product's next event.
DO $$
DECLARE
  v_product_id UUID;
BEGIN
  FOR v_product_id IN SELECT product_id FROM product_statistics LOOP
    PERFORM refresh_product_statistics(v_product_id);
  END LOOP;
END $$;
