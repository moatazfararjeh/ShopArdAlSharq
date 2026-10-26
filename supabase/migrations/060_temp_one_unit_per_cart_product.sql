-- 060_temp_one_unit_per_cart_product.sql
--
-- TEMPORARY. Brings back the one-line-per-product cart key next to the
-- per-unit key from 058, so app versions built before 058 can check out
-- again. They save the cart with ON CONFLICT (cart_id, product_id), which
-- fails ("no unique constraint matching") without this key.
--
-- Who still runs that code: every iPhone on 1.9.0 (Xcode builds never got
-- OTA updates until build 46) and any Android phone that hasn't applied the
-- latest update yet.
--
-- Cost while it's in place: a cart can't hold two units of the same product
-- (carton + pieces). The app blocks that with a clear message.
--
-- Undo once most phones run 1.9.1 build 46 or newer:
--   ALTER TABLE cart_items DROP CONSTRAINT cart_items_one_line_per_product;

-- Carts that already hold two units of a product keep one line: the
-- product's default unit if present, otherwise the most recent line.
DELETE FROM cart_items ci
USING (
  SELECT ci2.id, ROW_NUMBER() OVER (
           PARTITION BY ci2.cart_id, ci2.product_id
           ORDER BY (pu.is_default IS TRUE) DESC, ci2.updated_at DESC, ci2.created_at DESC
         ) AS rn
  FROM cart_items ci2
  LEFT JOIN product_units pu ON pu.product_id = ci2.product_id AND pu.unit = ci2.selected_unit
) ranked
WHERE ci.id = ranked.id AND ranked.rn > 1;

ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_one_line_per_product;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_one_line_per_product UNIQUE (cart_id, product_id);
