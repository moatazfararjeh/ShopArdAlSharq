-- 004_create_products.sql
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name_ar         TEXT NOT NULL,
  name_en         TEXT,
  slug            TEXT NOT NULL UNIQUE,
  description_ar  TEXT,
  description_en  TEXT,
  price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  discount_price  NUMERIC(10,2) CHECK (discount_price >= 0),
  stock_quantity  INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_available    BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  weight          NUMERIC(8,3),
  weight_unit     TEXT DEFAULT 'kg',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT discount_less_than_price CHECK (discount_price IS NULL OR discount_price < price)
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_is_available ON products(is_available);
CREATE INDEX idx_products_is_featured ON products(is_featured);
CREATE INDEX idx_products_slug ON products(slug);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
