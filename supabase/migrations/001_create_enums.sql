-- 001_create_enums.sql
CREATE TYPE user_role AS ENUM ('customer', 'admin', 'super_admin');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('cash_on_delivery', 'online');
CREATE TYPE notification_type AS ENUM ('order_update', 'promotion', 'system');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE inventory_action AS ENUM ('restock', 'sale', 'adjustment', 'return');
