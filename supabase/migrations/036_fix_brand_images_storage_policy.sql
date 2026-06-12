-- Fix: brand-images storage policies should require admin role, not just authenticated.
-- Previously any authenticated user could upload/update/delete brand images.

DROP POLICY IF EXISTS "Admins can upload brand images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update brand images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete brand images" ON storage.objects;

-- Only admins (admin or super_admin role) can manage brand images
CREATE POLICY "Admins can upload brand images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update brand images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete brand images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );
