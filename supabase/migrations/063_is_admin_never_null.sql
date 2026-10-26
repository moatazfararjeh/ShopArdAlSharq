-- 063_is_admin_never_null.sql
--
-- SECURITY FIX. is_admin() returned NULL (not false) for anyone without a
-- profile row — e.g. a request made with only the public anon key. Admin-only
-- functions check `IF NOT is_admin() THEN RAISE 'FORBIDDEN'`, and NOT NULL is
-- NULL, which PL/pgSQL treats as false: the check was skipped and the
-- function ran. Affected: admin_update_order_items (048), save_product_units
-- (057), send_push_notifications / check_push_receipts (062).
--
-- Returning false whenever the caller isn't an admin closes all of them at
-- once. RLS policies that use is_admin() behave exactly as before (NULL and
-- false both deny there).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'super_admin') FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

-- The campaign stats view ran with its owner's rights, so anyone with the
-- anon key could read campaign titles and counts. Run it with the caller's
-- rights instead: notifications RLS then shows admins every row and nobody
-- else anything beyond their own notifications.
ALTER VIEW public.promo_campaign_stats SET (security_invoker = on);
