-- Adds a "قسم" (section/department) level above categories:
--   section (e.g. "مواد غذائية") -> category (e.g. "ألبان") -> product
-- Brand stays an independent, cross-cutting tag on products (unchanged).
-- Existing categories get section_id = NULL until an admin assigns one —
-- nullable on purpose so this migration never blocks on existing data.
CREATE TABLE sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar         TEXT NOT NULL,
  name_en         TEXT,
  description_ar  TEXT,
  description_en  TEXT,
  image_url       TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sections_is_active ON sections(is_active);
CREATE INDEX idx_sections_sort_order ON sections(sort_order);

CREATE TRIGGER sections_updated_at
  BEFORE UPDATE ON sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE categories ADD COLUMN section_id UUID REFERENCES sections(id) ON DELETE SET NULL;
CREATE INDEX idx_categories_section_id ON categories(section_id);

ALTER TABLE sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active sections" ON sections
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage sections" ON sections
  FOR ALL USING (is_admin());

-- Storage bucket for section images, same shape as category-images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('section-images', 'section-images', TRUE, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read section images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'section-images');

CREATE POLICY "Admins manage section images"
  ON storage.objects FOR ALL
  USING (bucket_id = 'section-images' AND is_admin());
