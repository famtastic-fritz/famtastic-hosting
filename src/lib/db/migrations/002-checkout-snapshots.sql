-- Migration 002: checkout snapshots and orphan payments
--
-- checkout_snapshots: atomic snapshot of the cart at create-order time.
-- Consumed (status -> 'captured') in the same transaction that writes orders,
-- preventing TOCTOU and replay attacks.
--
-- orphan_payments: fallback table written when PayPal capture succeeds but
-- DB order-write fails, so no captured payment is silently lost.

CREATE TABLE IF NOT EXISTS checkout_snapshots (
  paypal_order_id  VARCHAR(40)  NOT NULL,
  session_id       VARCHAR(128) NOT NULL,
  subtotal_cents   INT UNSIGNED NOT NULL,
  items_json       TEXT         NOT NULL,
  status           ENUM('pending','captured','abandoned') NOT NULL DEFAULT 'pending',
  created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (paypal_order_id)
);

CREATE TABLE IF NOT EXISTS orphan_payments (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  paypal_order_id  VARCHAR(40)  NOT NULL,
  session_id       VARCHAR(128) NOT NULL,
  amount_captured  DECIMAL(10,2) NOT NULL,
  payer_email      VARCHAR(255),
  items_json       TEXT,
  error_msg        TEXT,
  resolved         TINYINT(1)   NOT NULL DEFAULT 0,
  created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_paypal_order (paypal_order_id)
);
