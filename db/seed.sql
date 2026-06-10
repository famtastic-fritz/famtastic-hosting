-- =============================================================================
-- FAMtastic Hosting — MySQL Seed Data
-- Product catalog (idempotent via ON DUPLICATE KEY UPDATE)
-- =============================================================================

SET NAMES utf8mb4;

-- Managed WordPress products
INSERT INTO `products` (`godaddy_product_id`, `name`, `category`, `wholesale_price_cents`, `retail_price_cents`, `markup_pct`, `billing_period`, `active`) VALUES
  ('wordpress-basic',    'Managed WP Basic',    'wordpress', 686,  1200, 74.93,  'monthly', TRUE),
  ('wordpress-ultimate', 'Managed WP Ultimate', 'wordpress', 781,  2400, 207.17, 'monthly', TRUE)
ON DUPLICATE KEY UPDATE
  `name`                  = VALUES(`name`),
  `category`              = VALUES(`category`),
  `wholesale_price_cents` = VALUES(`wholesale_price_cents`),
  `retail_price_cents`    = VALUES(`retail_price_cents`),
  `markup_pct`            = VALUES(`markup_pct`),
  `billing_period`        = VALUES(`billing_period`),
  `active`                = VALUES(`active`);

-- cPanel Hosting products
INSERT INTO `products` (`godaddy_product_id`, `name`, `category`, `wholesale_price_cents`, `retail_price_cents`, `markup_pct`, `billing_period`, `active`) VALUES
  ('cpanel-starter',  'cPanel Starter',  'hosting', 228,  700,  207.02, 'monthly', TRUE),
  ('cpanel-ultimate', 'cPanel Ultimate', 'hosting', 1003, 3100, 208.77, 'monthly', TRUE)
ON DUPLICATE KEY UPDATE
  `name`                  = VALUES(`name`),
  `category`              = VALUES(`category`),
  `wholesale_price_cents` = VALUES(`wholesale_price_cents`),
  `retail_price_cents`    = VALUES(`retail_price_cents`),
  `markup_pct`            = VALUES(`markup_pct`),
  `billing_period`        = VALUES(`billing_period`),
  `active`                = VALUES(`active`);

-- Website Builder products
INSERT INTO `products` (`godaddy_product_id`, `name`, `category`, `wholesale_price_cents`, `retail_price_cents`, `markup_pct`, `billing_period`, `active`) VALUES
  ('builder-essential', 'Website Builder Essential', 'builder', 236, 1200, 408.47, 'monthly', TRUE),
  ('builder-commerce',  'Website Builder Commerce',  'builder', 597, 3000, 402.51, 'monthly', TRUE)
ON DUPLICATE KEY UPDATE
  `name`                  = VALUES(`name`),
  `category`              = VALUES(`category`),
  `wholesale_price_cents` = VALUES(`wholesale_price_cents`),
  `retail_price_cents`    = VALUES(`retail_price_cents`),
  `markup_pct`            = VALUES(`markup_pct`),
  `billing_period`        = VALUES(`billing_period`),
  `active`                = VALUES(`active`);

-- Web Hosting Plus (Servers) products
INSERT INTO `products` (`godaddy_product_id`, `name`, `category`, `wholesale_price_cents`, `retail_price_cents`, `markup_pct`, `billing_period`, `active`) VALUES
  ('servers-launch',  'Web Hosting Plus Launch',  'servers', 1191, 3700,  210.66, 'monthly', TRUE),
  ('servers-expand',  'Web Hosting Plus Expand',  'servers', 4140, 12700, 206.76, 'monthly', TRUE)
ON DUPLICATE KEY UPDATE
  `name`                  = VALUES(`name`),
  `category`              = VALUES(`category`),
  `wholesale_price_cents` = VALUES(`wholesale_price_cents`),
  `retail_price_cents`    = VALUES(`retail_price_cents`),
  `markup_pct`            = VALUES(`markup_pct`),
  `billing_period`        = VALUES(`billing_period`),
  `active`                = VALUES(`active`);

-- Domain products (.com, .net, .org, .co)
INSERT INTO `products` (`godaddy_product_id`, `name`, `category`, `wholesale_price_cents`, `retail_price_cents`, `markup_pct`, `billing_period`, `active`) VALUES
  ('domain-com', '.com Domain Registration', 'domains', 1143, 2000, 74.97,  'annual', TRUE),
  ('domain-net', '.net Domain Registration', 'domains', 1429, 2500, 74.94,  'annual', TRUE),
  ('domain-org', '.org Domain Registration', 'domains', 1257, 2200, 75.02,  'annual', TRUE),
  ('domain-co',  '.co Domain Registration',  'domains', 1714, 3500, 104.08, 'annual', TRUE)
ON DUPLICATE KEY UPDATE
  `name`                  = VALUES(`name`),
  `category`              = VALUES(`category`),
  `wholesale_price_cents` = VALUES(`wholesale_price_cents`),
  `retail_price_cents`    = VALUES(`retail_price_cents`),
  `markup_pct`            = VALUES(`markup_pct`),
  `billing_period`        = VALUES(`billing_period`),
  `active`                = VALUES(`active`);

-- Email products
INSERT INTO `products` (`godaddy_product_id`, `name`, `category`, `wholesale_price_cents`, `retail_price_cents`, `markup_pct`, `billing_period`, `active`) VALUES
  ('email-pro',   'Professional Email', 'email', 137, 300,  119.12, 'monthly', TRUE),
  ('email-group', 'Group Email',       'email', 121, 400,  230.58, 'monthly', TRUE),
  ('email-m365',  'Microsoft 365',     'email', 245, 900,  267.35, 'monthly', TRUE)
ON DUPLICATE KEY UPDATE
  `name`                  = VALUES(`name`),
  `category`              = VALUES(`category`),
  `wholesale_price_cents` = VALUES(`wholesale_price_cents`),
  `retail_price_cents`    = VALUES(`retail_price_cents`),
  `markup_pct`            = VALUES(`markup_pct`),
  `billing_period`        = VALUES(`billing_period`),
  `active`                = VALUES(`active`);

-- SSL Certificate
INSERT INTO `products` (`godaddy_product_id`, `name`, `category`, `wholesale_price_cents`, `retail_price_cents`, `markup_pct`, `billing_period`, `active`) VALUES
  ('ssl-standard', 'SSL Standard Certificate', 'ssl', 3182, 7900, 148.26, 'annual', TRUE)
ON DUPLICATE KEY UPDATE
  `name`                  = VALUES(`name`),
  `category`              = VALUES(`category`),
  `wholesale_price_cents` = VALUES(`wholesale_price_cents`),
  `retail_price_cents`    = VALUES(`retail_price_cents`),
  `markup_pct`            = VALUES(`markup_pct`),
  `billing_period`        = VALUES(`billing_period`),
  `active`                = VALUES(`active`);

-- Security products
INSERT INTO `products` (`godaddy_product_id`, `name`, `category`, `wholesale_price_cents`, `retail_price_cents`, `markup_pct`, `billing_period`, `active`) VALUES
  ('security-standard', 'Website Security Standard', 'security', 457,  800,  75.05, 'monthly', TRUE),
  ('security-premium',  'Website Security Premium',  'security', 2229, 3900, 74.99, 'monthly', TRUE)
ON DUPLICATE KEY UPDATE
  `name`                  = VALUES(`name`),
  `category`              = VALUES(`category`),
  `wholesale_price_cents` = VALUES(`wholesale_price_cents`),
  `retail_price_cents`    = VALUES(`retail_price_cents`),
  `markup_pct`            = VALUES(`markup_pct`),
  `billing_period`        = VALUES(`billing_period`),
  `active`                = VALUES(`active`);