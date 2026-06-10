-- Subscriptions table for recurring services
-- Tracks subscription status, renewal dates, auto-renewal toggle

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  godaddy_subscription_id text unique,
  status text not null check (status in ('active', 'paused', 'cancelled', 'expired', 'grace_period')),
  current_period_start timestamp with time zone not null,
  current_period_end timestamp with time zone not null,
  auto_renew boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Customers can only see their own subscriptions
create policy "Customers see only their own subscriptions"
  on public.subscriptions for select
  using (
    auth.uid() = user_id
    or (
      select role from public.users where id = auth.uid()
    ) = 'admin'
  );

-- Admins can see all subscriptions
create policy "Admins can see all subscriptions"
  on public.subscriptions for select
  using (
    (select role from public.users where id = auth.uid()) = 'admin'
  );

-- Customers can update their own subscription (e.g., toggle auto_renew)
create policy "Customers can update their own subscriptions"
  on public.subscriptions for update
  using (auth.uid() = user_id);

-- Create indexes for fast lookups
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_product_id on public.subscriptions(product_id);
create index idx_subscriptions_status on public.subscriptions(status);
create index idx_subscriptions_current_period_end on public.subscriptions(current_period_end);
