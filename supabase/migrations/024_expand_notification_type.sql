-- 024_expand_notification_type.sql
-- Expand notification_type enum to support granular order status notifications
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'order_placed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'order_confirmed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'order_preparing';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'order_shipped';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'order_delivered';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'order_cancelled';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'promo';
