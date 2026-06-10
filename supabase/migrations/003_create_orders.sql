-- Orders table for tracking customer purchases and GoDaddy orders
-- Links to GoDaddy order system via godaddy_order_id

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  godaddy_order_id text unique not null,
  status text not null check (status in ('pending', 'active', 'cancelled', 'expired', 'processing', 'failed')),
  amount_cents integer not null comment 'Order total in cents (USD × 100)',
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.orders enable row level security;

-- Customers can only see their own orders
create policy "Customers see only their own orders"
  on public.orders for select
  using (
    auth.uid() = user_id
    or (
      select role from public.users where id = auth.uid()
    ) = 'admin'
  );

-- Admins can see all orders
create policy "Admins can see all orders"
  on public.orders for select
  using (
    (select role from public.users where id = auth.uid()) = 'admin'
  );

-- Create indexes for fast lookups
create index idx_orders_user_id on public.orders(user_id);
create index idx_orders_godaddy_order_id on public.orders(godaddy_order_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created_at on public.orders(created_at);
