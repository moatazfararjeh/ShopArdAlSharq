-- 031_add_commercial_register.sql
-- Add commercial register document URL to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commercial_register_url TEXT;

-- Create private documents bucket (5 MB limit, images + pdf)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  FALSE,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own folder
CREATE POLICY "Users upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Authenticated users can read their own documents
CREATE POLICY "Users read own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can read all documents
CREATE POLICY "Admins read all documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND is_admin());
