-- Seed data for FAMtastic Hosting product catalog
-- All prices are retail prices in cents (USD × 100)
-- Wholesale prices calculated from retail ÷ 1.75 markup (approximately)

-- Managed WordPress products
insert into public.products (godaddy_product_id, name, category, wholesale_price_cents, retail_price_cents, markup_pct, billing_period, active) values
  ('wordpress-basic', 'Managed WP Basic', 'wordpress', 686, 1200, 74.93, 'monthly', true),
  ('wordpress-ultimate', 'Managed WP Ultimate', 'wordpress', 781, 2400, 207.17, 'monthly', true);

-- cPanel Hosting products
insert into public.products (godaddy_product_id, name, category, wholesale_price_cents, retail_price_cents, markup_pct, billing_period, active) values
  ('cpanel-starter', 'cPanel Starter', 'hosting', 228, 700, 207.02, 'monthly', true),
  ('cpanel-ultimate', 'cPanel Ultimate', 'hosting', 1003, 3100, 208.77, 'monthly', true);

-- Website Builder products
insert into public.products (godaddy_product_id, name, category, wholesale_price_cents, retail_price_cents, markup_pct, billing_period, active) values
  ('builder-essential', 'Website Builder Essential', 'builder', 236, 1200, 408.47, 'monthly', true),
  ('builder-commerce', 'Website Builder Commerce', 'builder', 597, 3000, 402.51, 'monthly', true);

-- Web Hosting Plus (Servers) products
insert into public.products (godaddy_product_id, name, category, wholesale_price_cents, retail_price_cents, markup_pct, billing_period, active) values
  ('servers-launch', 'Web Hosting Plus Launch', 'servers', 1191, 3700, 210.66, 'monthly', true),
  ('servers-expand', 'Web Hosting Plus Expand', 'servers', 4140, 12700, 206.76, 'monthly', true);

-- Domain products (.com, .net, .org, .co)
insert into public.products (godaddy_product_id, name, category, wholesale_price_cents, retail_price_cents, markup_pct, billing_period, active) values
  ('domain-com', '.com Domain Registration', 'domains', 1143, 2000, 74.97, 'annual', true),
  ('domain-net', '.net Domain Registration', 'domains', 1429, 2500, 74.94, 'annual', true),
  ('domain-org', '.org Domain Registration', 'domains', 1257, 2200, 75.02, 'annual', true),
  ('domain-co', '.co Domain Registration', 'domains', 1714, 3500, 104.08, 'annual', true);

-- Email products
insert into public.products (godaddy_product_id, name, category, wholesale_price_cents, retail_price_cents, markup_pct, billing_period, active) values
  ('email-pro', 'Professional Email', 'email', 137, 300, 119.12, 'monthly', true),
  ('email-group', 'Group Email', 'email', 121, 400, 230.58, 'monthly', true),
  ('email-m365', 'Microsoft 365', 'email', 245, 900, 267.35, 'monthly', true);

-- SSL Certificate
insert into public.products (godaddy_product_id, name, category, wholesale_price_cents, retail_price_cents, markup_pct, billing_period, active) values
  ('ssl-standard', 'SSL Standard Certificate', 'ssl', 3182, 7900, 148.26, 'annual', true);

-- Security products
insert into public.products (godaddy_product_id, name, category, wholesale_price_cents, retail_price_cents, markup_pct, billing_period, active) values
  ('security-standard', 'Website Security Standard', 'security', 457, 800, 75.05, 'monthly', true),
  ('security-premium', 'Website Security Premium', 'security', 2229, 3900, 74.99, 'monthly', true);
