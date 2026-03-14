-- 016_rls_policies.sql

-- Helper: check if current user is admin/super_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role IN ('admin', 'super_admin')
  FROM profiles
  WHERE id = auth.uid()
$$;

-- profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- categories (public read)
CREATE POLICY "Anyone can read active categories" ON categories
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL USING (is_admin());

-- products (public read)
CREATE POLICY "Anyone can read available products" ON products
  FOR SELECT USING (is_available = TRUE);
CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (is_admin());

-- product_images (public read)
CREATE POLICY "Anyone can read product images" ON product_images
  FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage product images" ON product_images
  FOR ALL USING (is_admin());

-- carts
CREATE POLICY "Users can manage their own cart" ON carts
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own cart items" ON cart_items
  FOR ALL USING (
    cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid())
  );

-- addresses
CREATE POLICY "Users can manage their own addresses" ON addresses
  FOR ALL USING (auth.uid() = user_id);

-- orders
CREATE POLICY "Users can view their own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all orders" ON orders
  FOR ALL USING (is_admin());

-- order_items
CREATE POLICY "Users can view their own order items" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins can manage all order items" ON order_items
  FOR ALL USING (is_admin());

-- order_status_history
CREATE POLICY "Users can view their order history" ON order_status_history
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins can manage order status history" ON order_status_history
  FOR ALL USING (is_admin());

-- notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage notifications" ON notifications
  FOR ALL USING (is_admin());

-- favorites
CREATE POLICY "Users can manage their own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

-- reviews
CREATE POLICY "Anyone can read approved reviews" ON reviews
  FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can manage their own reviews" ON reviews
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all reviews" ON reviews
  FOR ALL USING (is_admin());

-- inventory_logs
CREATE POLICY "Admins can manage inventory logs" ON inventory_logs
  FOR ALL USING (is_admin());
