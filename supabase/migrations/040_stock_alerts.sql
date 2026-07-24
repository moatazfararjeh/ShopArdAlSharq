-- ════════════════════════════════════════════════════════════════════════════
-- Stock Alerts — customers subscribe to be notified when an out-of-stock
-- product comes back in stock. Admin triggers notifications from the edit
-- product screen.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE stock_alerts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_notified BOOLEAN     NOT NULL DEFAULT FALSE,
  notified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, user_id)
);

CREATE INDEX idx_stock_alerts_product ON stock_alerts(product_id);
CREATE INDEX idx_stock_alerts_user    ON stock_alerts(user_id);

ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

-- Users can subscribe / view / cancel their own alerts
CREATE POLICY "Users manage own stock alerts"
  ON stock_alerts
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all alerts (for subscriber count + notification dispatch)
CREATE POLICY "Admins read all stock alerts"
  ON stock_alerts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Admins can mark alerts as notified
CREATE POLICY "Admins update stock alerts"
  ON stock_alerts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
