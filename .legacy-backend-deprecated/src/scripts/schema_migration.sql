-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. Profiles (Extends auth.users)
-- ==========================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'manager', 'sales', 'production', 'designer', 'worker')),
  is_active BOOLEAN DEFAULT true,
  avatar TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- 2. Customers
-- ==========================================
CREATE TABLE public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  company TEXT,
  wilaya TEXT,
  address TEXT,
  is_guest BOOLEAN DEFAULT false,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. Products
-- ==========================================
CREATE TABLE public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  description_ar TEXT,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('bags', 'apparel', 'hats', 'accessories', 'packaging', 'stationery', 'other')),
  base_price NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  min_quantity INTEGER DEFAULT 1 NOT NULL,
  unit_of_measure TEXT DEFAULT 'piece' NOT NULL,
  is_active BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  stock_quantity INTEGER DEFAULT 0,
  images JSONB,
  attributes JSONB,
  price_tiers JSONB, -- Array of {quantity, price}
  print_options JSONB, -- Complex object for print configs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. Product Variants
-- ==========================================
CREATE TABLE public.product_variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  sku TEXT NOT NULL,
  price NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  stock_quantity INTEGER DEFAULT 0 NOT NULL,
  options JSONB, -- Record<string, string>
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. Orders
-- ==========================================
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'refunded')),
  payment_method TEXT DEFAULT 'cash_on_delivery' CHECK (payment_method IN ('cash_on_delivery', 'bank_transfer', 'office_pickup', 'credit_card')),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  guest_info JSONB,
  subtotal NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  discount NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  shipping NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  tax NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  total NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  shipping_address JSONB,
  tracking_number TEXT,
  notes TEXT,
  internal_notes TEXT,
  source TEXT DEFAULT 'storefront' CHECK (source IN ('storefront', 'erp')),
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  production_status JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 6. Order Items
-- ==========================================
CREATE TABLE public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  sku TEXT,
  unit_price NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL,
  total NUMERIC(10, 2) DEFAULT 0 NOT NULL,
  customization JSONB,
  production_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 7. Tasks (Production)
-- ==========================================
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'printing' CHECK (type IN ('design', 'pre_press', 'screen_making', 'printing', 'quality_check', 'packing', 'shipping')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'paused', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  estimated_hours NUMERIC(4, 1) DEFAULT 0,
  actual_hours NUMERIC(4, 1) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ,
  notes TEXT,
  attachments JSONB, -- Array of file URLs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to_id);
CREATE INDEX idx_tasks_order_id ON public.tasks(order_id);
