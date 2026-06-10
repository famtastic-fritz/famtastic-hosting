-- Contact submissions from "Talk to a Human" form on website
-- Visible to admins only

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  ip_address inet,
  resolved boolean default false,
  resolved_at timestamp with time zone,
  admin_notes text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.contact_submissions enable row level security;

-- Only admins can view submissions
create policy "Admins can view all submissions"
  on public.contact_submissions for select
  using (
    (select role from public.users where id = auth.uid()) = 'admin'
  );

-- Only admins can update submissions (mark as resolved, add notes)
create policy "Admins can update submissions"
  on public.contact_submissions for update
  using (
    (select role from public.users where id = auth.uid()) = 'admin'
  );

-- Anyone can insert (public form)
create policy "Public can submit contact form"
  on public.contact_submissions for insert
  with check (true);

-- Create indexes for fast lookups
create index idx_contact_submissions_email on public.contact_submissions(email);
create index idx_contact_submissions_resolved on public.contact_submissions(resolved);
create index idx_contact_submissions_created_at on public.contact_submissions(created_at);
