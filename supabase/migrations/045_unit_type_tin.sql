ALTER TABLE products DROP CONSTRAINT IF EXISTS products_unit_type_check;
ALTER TABLE products ADD CONSTRAINT products_unit_type_check CHECK (unit_type IN ('piece', 'kg', 'carton', 'tin'));
