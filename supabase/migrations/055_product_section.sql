-- Products now carry their own section_id directly (set independently on
-- the product form, same as category_id/brand_id), rather than only being
-- inferable through their category's section.
ALTER TABLE products ADD COLUMN section_id UUID REFERENCES sections(id) ON DELETE SET NULL;
CREATE INDEX idx_products_section_id ON products(section_id);
