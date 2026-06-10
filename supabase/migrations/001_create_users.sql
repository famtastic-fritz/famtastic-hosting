-- Users table for FAMtastic Hosting customers and admins
-- Uses Supabase Auth for authentication
-- id is UUID from auth.users

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null check (role in ('customer', 'admin')),
  godaddy_shopper_id text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.users enable row level security;

-- Customers can only see their own row
create policy "Customers see only their own user record"
  on public.users for select
  using (
    auth.uid() = id
    or (
      select role from public.users where id = auth.uid()
    ) = 'admin'
  );

-- Admins can see all users
create policy "Admins can see all users"
  on public.users for select
  using (
    (select role from public.users where id = auth.uid()) = 'admin'
  );

-- Users can update their own row
create policy "Users can update their own record"
  on public.users for update
  using (auth.uid() = id);

-- Users can insert their own record (during signup)
create policy "Users can insert their own record"
  on public.users for insert
  with check (auth.uid() = id);

-- Create index on email for fast lookups
create index idx_users_email on public.users(email);

-- Create index on godaddy_shopper_id for syncing
create index idx_users_godaddy_shopper_id on public.users(godaddy_shopper_id);
