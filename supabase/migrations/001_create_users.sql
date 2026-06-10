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

-- SECURITY DEFINER helper to check admin status without triggering RLS recursion.
-- Runs as the definer (postgres superuser) so it bypasses RLS on the users table.
create or replace function public.is_admin()
  returns boolean language sql stable security definer
  set search_path = public as $$
    select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
  $$;

-- Customers can only see their own row; admins see all rows via is_admin().
-- Single policy replaces the previous two to avoid duplicate-policy conflicts.
create policy "Users see their own record, admins see all"
  on public.users for select
  using (
    auth.uid() = id
    or public.is_admin()
  );

-- Users can update their own row — role column is locked separately below.
-- WITH CHECK pins role to its current value so it cannot be self-escalated.
create policy "Users can update their own record"
  on public.users for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.users where id = auth.uid())
  );

-- Revoke column-level UPDATE on role entirely — admins use service-role key.
revoke update (role) on public.users from authenticated;

-- Users can insert their own record (during signup) — must be role='customer'.
create policy "Users can insert their own record"
  on public.users for insert
  with check (auth.uid() = id and role = 'customer');

-- Create index on email for fast lookups
create index idx_users_email on public.users(email);

-- Create index on godaddy_shopper_id for syncing
create index idx_users_godaddy_shopper_id on public.users(godaddy_shopper_id);
