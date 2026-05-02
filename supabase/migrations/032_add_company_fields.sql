-- 032_add_company_fields.sql
-- Add company name and commercial registration number to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commercial_register_number TEXT;
