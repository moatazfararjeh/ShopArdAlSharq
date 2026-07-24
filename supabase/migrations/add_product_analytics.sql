-- ═══════════════════════════════════════════════════════════════════════════════
-- Product Analytics / Statistics Tables
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Event Types ─────────────────────────────────────────────────────────────
CREATE TYPE product_event_type AS ENUM (
  'view',            -- المشاهدات - user opened product detail
  'impression',      -- الظهور - product appeared in listing/search
  'add_to_cart',     -- اضافة للسلة - user added product to cart
  'share',           -- مشاركة الاعلان - user shared product
  'wishlist',        -- المفضلة - user added to wishlist/favorites
  'purchase',        -- الشراء - user completed purchase
  'remove_from_cart' -- ازالة من السلة - user removed from cart
);

-- ─── Product Events (raw event log) ─────────────────────────────────────────
CREATE TABLE product_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type  product_event_type NOT NULL,
  session_id  TEXT,  -- anonymous session tracking
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX idx_product_events_product_id ON product_events(product_id);
CREATE INDEX idx_product_events_event_type ON product_events(event_type);
CREATE INDEX idx_product_events_user_id ON product_events(user_id);
CREATE INDEX idx_product_events_created_at ON product_events(created_at DESC);
CREATE INDEX idx_product_events_product_type ON product_events(product_id, event_type);

-- ─── Product Statistics (aggregated / materialized) ──────────────────────────
CREATE TABLE product_statistics (
  product_id        UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  views_count       INTEGER NOT NULL DEFAULT 0,
  impressions_count INTEGER NOT NULL DEFAULT 0,
  add_to_cart_count INTEGER NOT NULL DEFAULT 0,
  shares_count      INTEGER NOT NULL DEFAULT 0,
  wishlist_count    INTEGER NOT NULL DEFAULT 0,
  purchases_count   INTEGER NOT NULL DEFAULT 0,
  unique_viewers    INTEGER NOT NULL DEFAULT 0,
  unique_cart_users INTEGER NOT NULL DEFAULT 0,
  abandoned_cart_users INTEGER NOT NULL DEFAULT 0, -- أضاف للسلة ولم يشتري
  conversion_rate   NUMERIC(5,2) DEFAULT 0,       -- نسبة التحويل
  avg_time_to_purchase INTERVAL,                  -- متوسط وقت الشراء
  last_viewed_at    TIMESTAMPTZ,
  last_purchased_at TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Function: Increment product stat ────────────────────────────────────────
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
  -- Insert raw event
  INSERT INTO product_events (product_id, user_id, event_type, session_id, metadata)
  VALUES (p_product_id, p_user_id, p_event_type, p_session_id, p_metadata)
  RETURNING id INTO v_event_id;

  -- Upsert aggregated statistics
  INSERT INTO product_statistics (product_id)
  VALUES (p_product_id)
  ON CONFLICT (product_id) DO NOTHING;

  -- Update counts based on event type
  CASE p_event_type
    WHEN 'view' THEN
      UPDATE product_statistics
      SET views_count = views_count + 1,
          last_viewed_at = NOW(),
          updated_at = NOW()
      WHERE product_id = p_product_id;
    WHEN 'impression' THEN
      UPDATE product_statistics
      SET impressions_count = impressions_count + 1,
          updated_at = NOW()
      WHERE product_id = p_product_id;
    WHEN 'add_to_cart' THEN
      UPDATE product_statistics
      SET add_to_cart_count = add_to_cart_count + 1,
          updated_at = NOW()
      WHERE product_id = p_product_id;
    WHEN 'share' THEN
      UPDATE product_statistics
      SET shares_count = shares_count + 1,
          updated_at = NOW()
      WHERE product_id = p_product_id;
    WHEN 'wishlist' THEN
      UPDATE product_statistics
      SET wishlist_count = wishlist_count + 1,
          updated_at = NOW()
      WHERE product_id = p_product_id;
    WHEN 'purchase' THEN
      UPDATE product_statistics
      SET purchases_count = purchases_count + 1,
          last_purchased_at = NOW(),
          updated_at = NOW()
      WHERE product_id = p_product_id;
    ELSE
      NULL;
  END CASE;

  RETURN v_event_id;
END;
$$;

-- ─── Function: Refresh unique users & abandoned cart stats ───────────────────
CREATE OR REPLACE FUNCTION refresh_product_statistics(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE product_statistics
  SET
    unique_viewers = (
      SELECT COUNT(DISTINCT user_id)
      FROM product_events
      WHERE product_id = p_product_id AND event_type = 'view' AND user_id IS NOT NULL
    ),
    unique_cart_users = (
      SELECT COUNT(DISTINCT user_id)
      FROM product_events
      WHERE product_id = p_product_id AND event_type = 'add_to_cart' AND user_id IS NOT NULL
    ),
    abandoned_cart_users = (
      SELECT COUNT(DISTINCT pe.user_id)
      FROM product_events pe
      WHERE pe.product_id = p_product_id
        AND pe.event_type = 'add_to_cart'
        AND pe.user_id IS NOT NULL
        AND pe.user_id NOT IN (
          SELECT DISTINCT user_id
          FROM product_events
          WHERE product_id = p_product_id AND event_type = 'purchase' AND user_id IS NOT NULL
        )
    ),
    conversion_rate = (
      CASE
        WHEN (SELECT COUNT(DISTINCT user_id) FROM product_events WHERE product_id = p_product_id AND event_type = 'view' AND user_id IS NOT NULL) > 0
        THEN ROUND(
          (SELECT COUNT(DISTINCT user_id) FROM product_events WHERE product_id = p_product_id AND event_type = 'purchase' AND user_id IS NOT NULL)::NUMERIC /
          (SELECT COUNT(DISTINCT user_id) FROM product_events WHERE product_id = p_product_id AND event_type = 'view' AND user_id IS NOT NULL)::NUMERIC * 100,
          2
        )
        ELSE 0
      END
    ),
    updated_at = NOW()
  WHERE product_id = p_product_id;
END;
$$;

-- ─── RLS Policies ────────────────────────────────────────────────────────────
ALTER TABLE product_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_statistics ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (for tracking)
CREATE POLICY "Anyone can insert product events"
  ON product_events FOR INSERT
  WITH CHECK (true);

-- Only admins can read raw events
CREATE POLICY "Admins can read product events"
  ON product_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Anyone can read statistics (public data)
CREATE POLICY "Anyone can read product statistics"
  ON product_statistics FOR SELECT
  USING (true);

-- Only system/admins can update statistics
CREATE POLICY "System can manage product statistics"
  ON product_statistics FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
