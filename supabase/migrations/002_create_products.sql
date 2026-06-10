-- Products table for catalog of all hosting, domain, and email products
-- Includes wholesale and retail pricing
-- Synced from GoDaddy API

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  godaddy_product_id text unique not null,
  name text not null,
  category text not null check (category in ('wordpress', 'hosting', 'builder', 'servers', 'domains', 'email', 'ssl', 'security')),
  wholesale_price_cents integer not null comment 'Price in cents (USD × 100)',
  retail_price_cents integer not null comment 'Price in cents (USD × 100)',
  markup_pct numeric(5, 2) not null comment 'Markup percentage (e.g., 75.00 for 75%)',
  billing_period text check (billing_period in ('monthly', 'annual')) default 'monthly',
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.products enable row level security;

-- Customers can see all active products
create policy "Customers see active products"
  on public.products for select
  using (active = true);

-- Admins can see all products (including inactive)
create policy "Admins see all products"
  on public.products for select
  using (
    (select role from public.users where id = auth.uid()) = 'admin'
  );

-- Admins can update products
create policy "Admins can update products"
  on public.products for update
  using (
    (select role from public.users where id = auth.uid()) = 'admin'
  );

-- Create indexes for fast lookups
create index idx_products_category on public.products(category);
create index idx_products_godaddy_product_id on public.products(godaddy_product_id);
create index idx_products_active on public.products(active);
