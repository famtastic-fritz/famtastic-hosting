-- Migration 002: guest checkout hardening
--
-- Canonical schema delta for the PayPal guest-checkout flow.
-- For existing deployed databases, use scripts/migrate-db.js so stale tables,
-- foreign keys, and nullable constraints are upgraded safely and idempotently.
--
-- Runtime dependencies:
-- - cart_items powers the session cart and checkout snapshot source of truth
-- - checkout_snapshots locks cart state at PayPal order creation time
-- - orphan_payments preserves captured payments when DB writes fail after capture

-- Existing deployments must ensure:
--   ALTER TABLE `orders` MODIFY COLUMN `user_id` INT DEFAULT NULL;
--   ALTER TABLE `orders` DROP FOREIGN KEY `fk_orders_user_id`;
--   ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_user_id`
--     FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS `cart_items` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `session_id`  VARCHAR(128) NOT NULL,
  `product_id`  INT NOT NULL,
  `quantity`    INT NOT NULL DEFAULT 1,
  `user_id`     INT DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_cart_session_product` (`session_id`, `product_id`),
  KEY `idx_cart_items_session_id` (`session_id`),
  KEY `idx_cart_items_user_id` (`user_id`),
  CONSTRAINT `fk_cart_items_product_id` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_items_user_id`    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `checkout_snapshots` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `paypal_order_id` VARCHAR(64) NOT NULL,
  `session_id`      VARCHAR(128) NOT NULL,
  `subtotal_cents`  INT NOT NULL,
  `items_json`      JSON NOT NULL,
  `status`          ENUM('pending','captured','expired') NOT NULL DEFAULT 'pending',
  `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_checkout_snapshots_paypal_order_id` (`paypal_order_id`),
  KEY `idx_checkout_snapshots_session_id` (`session_id`),
  KEY `idx_checkout_snapshots_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orphan_payments` (
  `id`                INT AUTO_INCREMENT PRIMARY KEY,
  `paypal_order_id`   VARCHAR(64) NOT NULL,
  `session_id`        VARCHAR(128) DEFAULT NULL,
  `amount_captured`   DECIMAL(10,2) NOT NULL,
  `payer_email`       VARCHAR(255) DEFAULT NULL,
  `items_json`        JSON DEFAULT NULL,
  `error_msg`         TEXT DEFAULT NULL,
  `resolved`          BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_orphan_payments_paypal_order_id` (`paypal_order_id`),
  KEY `idx_orphan_payments_resolved` (`resolved`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
