-- =============================================================================
-- FAMtastic Hosting — MySQL 8+ Schema
-- Consolidated DDL for ALL tables.
--
-- Converted from Supabase/Postgres migrations:
--   • uuid → INT AUTO_INCREMENT
--   • timestamp with time zone → DATETIME
--   • gen_random_uuid() → AUTO_INCREMENT
--   • CHECK (… IN (…)) → ENUM / SET
--   • RLS policies → comments (enforce in app layer)
--   • auth.users references → removed (local auth)
--   • ON CONFLICT … DO NOTHING → ON DUPLICATE KEY UPDATE
--   • inet → VARCHAR(45)
-- =============================================================================
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `email`      VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt hash — app-layer auth',
  `role`       ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  `godaddy_shopper_id` VARCHAR(64) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_godaddy_shopper_id` (`godaddy_shopper_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RLS equivalent: app layer must enforce that customers see only their own row;
-- admins see all.  Role changes must go through admin-only paths.

-- ---------------------------------------------------------------------------
-- sessions  (express-mysql-session)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` VARCHAR(128) NOT NULL,
  `expires`    INT UNSIGNED NOT NULL,
  `data`       TEXT DEFAULT NULL,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id`                    INT AUTO_INCREMENT PRIMARY KEY,
  `godaddy_product_id`    VARCHAR(64) NOT NULL,
  `name`                  VARCHAR(255) NOT NULL,
  `category`              ENUM('wordpress','hosting','builder','servers','domains','email','ssl','security') NOT NULL,
  `wholesale_price_cents` INT NOT NULL COMMENT 'Price in cents (USD × 100)',
  `retail_price_cents`    INT NOT NULL COMMENT 'Price in cents (USD × 100)',
  `markup_pct`            DECIMAL(5,2) NOT NULL COMMENT 'Markup percentage (e.g., 75.00 for 75%)',
  `billing_period`        ENUM('monthly','annual') DEFAULT 'monthly',
  `active`                BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_products_godaddy_product_id` (`godaddy_product_id`),
  KEY `idx_products_category` (`category`),
  KEY `idx_products_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RLS equivalent: app layer must gate visibility — customers see active only;
-- admins see all.  Only admins may update products.

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`           INT NOT NULL,
  `product_id`        INT DEFAULT NULL,
  `godaddy_order_id`  VARCHAR(64) NOT NULL,
  `status`            ENUM('pending','active','cancelled','expired','processing','failed') NOT NULL DEFAULT 'pending',
  `amount_cents`      INT NOT NULL COMMENT 'Order total in cents (USD × 100)',
  `description`       TEXT DEFAULT NULL,
  `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_orders_godaddy_order_id` (`godaddy_order_id`),
  KEY `idx_orders_user_id` (`user_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_created_at` (`created_at`),
  CONSTRAINT `fk_orders_user_id`    FOREIGN KEY (`user_id`)    REFERENCES `users`    (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_orders_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RLS equivalent: customers see only their own orders; admins see all.
-- Enforce in app layer.

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id`                      INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`                 INT NOT NULL,
  `product_id`              INT NOT NULL,
  `godaddy_subscription_id` VARCHAR(64) DEFAULT NULL,
  `status`                  ENUM('active','paused','cancelled','expired','grace_period') NOT NULL DEFAULT 'active',
  `current_period_start`    DATETIME NOT NULL,
  `current_period_end`      DATETIME NOT NULL,
  `auto_renew`              BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at`              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_subscriptions_godaddy_subscription_id` (`godaddy_subscription_id`),
  KEY `idx_subscriptions_user_id` (`user_id`),
  KEY `idx_subscriptions_product_id` (`product_id`),
  KEY `idx_subscriptions_status` (`status`),
  KEY `idx_subscriptions_current_period_end` (`current_period_end`),
  CONSTRAINT `fk_subscriptions_user_id`    FOREIGN KEY (`user_id`)    REFERENCES `users`    (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_subscriptions_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RLS equivalent: customers see only their own rows; only auto_renew may be
-- changed by customers.  All other columns are admin-only.  Enforce in app layer.

-- ---------------------------------------------------------------------------
-- contact_submissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contact_submissions` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `name`         VARCHAR(255) NOT NULL,
  `email`        VARCHAR(255) NOT NULL,
  `subject`      VARCHAR(255) NOT NULL,
  `message`      TEXT NOT NULL,
  `ip_address`   VARCHAR(45) DEFAULT NULL COMMENT 'IPv4 or IPv6 — set by server only',
  `resolved`     BOOLEAN NOT NULL DEFAULT FALSE,
  `resolved_at`  DATETIME DEFAULT NULL,
  `admin_notes`  TEXT DEFAULT NULL,
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_contact_submissions_email` (`email`),
  KEY `idx_contact_submissions_resolved` (`resolved`),
  KEY `idx_contact_submissions_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- RLS equivalent: public may INSERT (name, email, subject, message only);
-- ip_address / resolved / resolved_at / admin_notes are admin-only.
-- Enforce in app layer.

-- ---------------------------------------------------------------------------
-- admin_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_settings` (
  `key`         VARCHAR(64) PRIMARY KEY,
  `value`       TEXT NOT NULL,
  `description` TEXT DEFAULT NULL,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default settings (idempotent via ON DUPLICATE KEY UPDATE)
INSERT INTO `admin_settings` (`key`, `value`, `description`) VALUES
  ('support_phone',     '(480) 624-2500',          'GoDaddy white-label support phone number'),
  ('site_name',         'FAMtastic Hosting',       'Brand name for dashboard'),
  ('site_url',          'https://famtastichosting.com', 'Primary site URL'),
  ('notification_email', 'hello@famtastichosting.com',   'Email for admin notifications')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);

-- RLS equivalent: only admins may read / write.  Enforce in app layer.

-- ---------------------------------------------------------------------------
-- godaddy_renewals
-- Tracks upcoming domain/service renewals synced from GoDaddy Reseller API.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `godaddy_renewals` (
  `id`                  INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`             INT NOT NULL,
  `godaddy_order_id`    VARCHAR(64) NOT NULL,
  `domain`              VARCHAR(253) NOT NULL,
  `product_type`        VARCHAR(64) NOT NULL COMMENT 'e.g. domain, hosting, ssl',
  `renewal_date`        DATETIME NOT NULL,
  `auto_renew`          BOOLEAN NOT NULL DEFAULT FALSE,
  `notified`            BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Whether reminder email was sent',
  `created_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_godaddy_renewals_user_id` (`user_id`),
  KEY `idx_godaddy_renewals_renewal_date` (`renewal_date`),
  KEY `idx_godaddy_renewals_notified` (`notified`),
  CONSTRAINT `fk_godaddy_renewals_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- godaddy_available_reports
-- Cash-basis / profitability reports generated from GoDaddy Reseller API.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `godaddy_available_reports` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `report_type`    VARCHAR(64) NOT NULL COMMENT 'e.g. monthly_summary, daily_detail',
  `period_start`   DATE NOT NULL,
  `period_end`     DATE NOT NULL,
  `data_payload`   JSON NOT NULL COMMENT 'Full report payload',
  `generated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_godaddy_reports_type_period` (`report_type`, `period_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;