-- Admin settings for configuration
-- Key-value pairs for branding, support phone, API references, etc.

create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.admin_settings enable row level security;

-- Only admins can read settings.
-- Uses is_admin() (SECURITY DEFINER) to avoid circular privilege escalation
-- through the users table, which customers can write to.
create policy "Admins can read settings"
  on public.admin_settings for select
  using (public.is_admin());

-- Only admins can update settings.
create policy "Admins can update settings"
  on public.admin_settings for update
  using (public.is_admin());

-- Only admins can insert settings.
create policy "Admins can insert settings"
  on public.admin_settings for insert
  with check (public.is_admin());

-- Seed default settings
insert into public.admin_settings (key, value, description) values
  ('support_phone', '(480) 624-2500', 'GoDaddy white-label support phone number'),
  ('site_name', 'FAMtastic Hosting', 'Brand name for dashboard'),
  ('site_url', 'https://famtastichosting.com', 'Primary site URL'),
  ('notification_email', 'hello@famtastichosting.com', 'Email for admin notifications')
on conflict (key) do nothing;
