-- 058_cart_lines_per_unit.sql
--
-- A cart holds one line per product *and unit*: 3 pieces and 1 carton of the
-- same product are two lines. Until now the key was (cart, product), so the
-- second unit overwrote the first and checkout charged the wrong total.
-- A line saved without a unit gets the product's default unit, so "no unit"
-- and "default unit" are always the same line.
CREATE OR REPLACE FUNCTION trg_cart_items_default_unit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.selected_unit IS NULL THEN
    SELECT unit INTO NEW.selected_unit FROM product_units
    WHERE product_id = NEW.product_id AND is_default;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cart_items_default_unit ON cart_items;
CREATE TRIGGER cart_items_default_unit
  BEFORE INSERT OR UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION trg_cart_items_default_unit();

UPDATE cart_items SET selected_unit = NULL WHERE selected_unit IS NULL;  -- fills existing lines via the trigger

-- Drop the old (cart, product) key whatever it is named (006 calls it cart_items_unique).
DO $$
DECLARE
  v_conname TEXT;
BEGIN
  FOR v_conname IN
    SELECT con.conname FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'cart_items' AND con.contype = 'u'
      AND (SELECT array_agg(att.attname::TEXT ORDER BY att.attname)
           FROM pg_attribute att
           WHERE att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)) = ARRAY['cart_id', 'product_id']
  LOOP
    EXECUTE format('ALTER TABLE cart_items DROP CONSTRAINT %I', v_conname);
  END LOOP;
END $$;

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_unit_unique;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_unit_unique UNIQUE (cart_id, product_id, selected_unit);
