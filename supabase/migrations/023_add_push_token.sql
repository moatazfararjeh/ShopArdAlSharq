-- 023_add_push_token.sql
-- Add Expo push notification token to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
