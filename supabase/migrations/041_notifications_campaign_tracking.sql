-- ════════════════════════════════════════════════════════════════════════════
-- Add campaign_id and read_at to notifications for broadcast campaign tracking
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS campaign_id UUID,
  ADD COLUMN IF NOT EXISTS read_at     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_campaign ON notifications(campaign_id)
  WHERE campaign_id IS NOT NULL;

-- ── Campaign stats view (admin only) ─────────────────────────────────────────
CREATE OR REPLACE VIEW promo_campaign_stats AS
SELECT
  campaign_id,
  title_ar,
  body_ar,
  MIN(created_at)                                    AS sent_at,
  COUNT(*)                                           AS sent_count,
  COUNT(*) FILTER (WHERE is_read = TRUE)             AS read_count
FROM notifications
WHERE type = 'promo' AND campaign_id IS NOT NULL
GROUP BY campaign_id, title_ar, body_ar
ORDER BY MIN(created_at) DESC;
