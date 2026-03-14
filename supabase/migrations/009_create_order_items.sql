-- 009_create_order_items.sql
CREATE TABLE order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,
  -- Snapshot of product data at order time
  product_name_ar   TEXT NOT NULL,
  product_name_en   TEXT,
  unit_price        NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity          INT NOT NULL CHECK (quantity > 0),
  total_price       NUMERIC(10,2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
