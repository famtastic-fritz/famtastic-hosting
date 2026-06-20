-- Migration 005: add payer_email to orders for transactional email

ALTER TABLE `orders`
  ADD COLUMN `payer_email` VARCHAR(255) NULL AFTER `user_id`;
