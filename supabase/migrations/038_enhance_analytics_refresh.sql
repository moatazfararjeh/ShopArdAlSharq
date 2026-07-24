-- ═══════════════════════════════════════════════════════════════════════════════
-- Enhance refresh_product_statistics to recompute ALL counts from raw events,
-- not just derived metrics. This ensures a full recalculation fixes any drift
-- between product_events and product_statistics.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION refresh_product_statistics(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure a statistics row exists before updating
  INSERT INTO product_statistics (product_id)
  VALUES (p_product_id)
  ON CONFLICT (product_id) DO NOTHING;

  UPDATE product_statistics
  SET
    -- ── Raw event counts (recomputed from source) ──────────────────────────
    views_count = (
      SELECT COUNT(*) FROM product_events
      WHERE product_id = p_product_id AND event_type = 'view'
    ),
    impressions_count = (
      SELECT COUNT(*) FROM product_events
      WHERE product_id = p_product_id AND event_type = 'impression'
    ),
    add_to_cart_count = (
      SELECT COUNT(*) FROM product_events
      WHERE product_id = p_product_id AND event_type = 'add_to_cart'
    ),
    shares_count = (
      SELECT COUNT(*) FROM product_events
      WHERE product_id = p_product_id AND event_type = 'share'
    ),
    wishlist_count = (
      SELECT COUNT(*) FROM product_events
      WHERE product_id = p_product_id AND event_type = 'wishlist'
    ),
    purchases_count = (
      SELECT COUNT(*) FROM product_events
      WHERE product_id = p_product_id AND event_type = 'purchase'
    ),

    -- ── Unique user metrics ────────────────────────────────────────────────
    unique_viewers = (
      SELECT COUNT(DISTINCT user_id) FROM product_events
      WHERE product_id = p_product_id AND event_type = 'view' AND user_id IS NOT NULL
    ),
    unique_cart_users = (
      SELECT COUNT(DISTINCT user_id) FROM product_events
      WHERE product_id = p_product_id AND event_type = 'add_to_cart' AND user_id IS NOT NULL
    ),
    abandoned_cart_users = (
      SELECT COUNT(DISTINCT pe.user_id)
      FROM product_events pe
      WHERE pe.product_id = p_product_id
        AND pe.event_type = 'add_to_cart'
        AND pe.user_id IS NOT NULL
        AND pe.user_id NOT IN (
          SELECT DISTINCT user_id FROM product_events
          WHERE product_id = p_product_id AND event_type = 'purchase' AND user_id IS NOT NULL
        )
    ),

    -- ── Conversion rate (unique purchasers / unique viewers) ───────────────
    conversion_rate = (
      CASE
        WHEN (
          SELECT COUNT(DISTINCT user_id) FROM product_events
          WHERE product_id = p_product_id AND event_type = 'view' AND user_id IS NOT NULL
        ) > 0
        THEN ROUND(
          (SELECT COUNT(DISTINCT user_id) FROM product_events
           WHERE product_id = p_product_id AND event_type = 'purchase' AND user_id IS NOT NULL
          )::NUMERIC /
          (SELECT COUNT(DISTINCT user_id) FROM product_events
           WHERE product_id = p_product_id AND event_type = 'view' AND user_id IS NOT NULL
          )::NUMERIC * 100,
          2
        )
        ELSE 0
      END
    ),

    -- ── Timestamps ────────────────────────────────────────────────────────
    last_viewed_at = (
      SELECT MAX(created_at) FROM product_events
      WHERE product_id = p_product_id AND event_type = 'view'
    ),
    last_purchased_at = (
      SELECT MAX(created_at) FROM product_events
      WHERE product_id = p_product_id AND event_type = 'purchase'
    ),
    updated_at = NOW()

  WHERE product_id = p_product_id;
END;
$$;
