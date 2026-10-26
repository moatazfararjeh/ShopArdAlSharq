-- 061_fix_handle_new_user_search_path.sql
--
-- Sign-up failed with "Database error saving new user" after 059.
-- 059 replaced handle_new_user() with a version that writes to `profiles`
-- without a schema. Supabase Auth inserts into auth.users with a search_path
-- that doesn't include `public`, so the trigger couldn't find the table and
-- the whole sign-up was rolled back. (The live function had evidently been
-- fixed in Studio before; 059 overwrote that.)
--
-- Fix: pin search_path and qualify the table, keeping 059's sign-up source.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, signup_source, signup_app_version)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    CASE WHEN NEW.raw_user_meta_data->>'signup_source' IN ('web', 'ios', 'android')
         THEN NEW.raw_user_meta_data->>'signup_source' END,
    LEFT(NULLIF(TRIM(NEW.raw_user_meta_data->>'signup_app_version'), ''), 40)
  );
  RETURN NEW;
END;
$$;

-- Other functions from these migrations that run under Supabase roles with a
-- different search_path: pin them too so they can't break the same way.
ALTER FUNCTION public.trg_cart_items_default_unit() SET search_path = public;
ALTER FUNCTION public.trg_product_units_sync() SET search_path = public;
ALTER FUNCTION public.trg_product_units_after() SET search_path = public;
ALTER FUNCTION public.product_unit_effective_price(public.product_units) SET search_path = public;
ALTER FUNCTION public.product_unit_label(TEXT) SET search_path = public;
