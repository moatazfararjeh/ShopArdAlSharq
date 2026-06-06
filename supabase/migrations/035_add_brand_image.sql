-- Add image_url column to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS image_url text;

-- Create brand-images storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-images', 'brand-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload brand images
CREATE POLICY "Admins can upload brand images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'brand-images');

CREATE POLICY "Admins can update brand images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'brand-images');

CREATE POLICY "Admins can delete brand images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'brand-images');

CREATE POLICY "Anyone can view brand images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'brand-images');
