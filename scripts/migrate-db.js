#!/usr/bin/env node
/**
 * Run this on the server after deploying the updated checkout code:
 *   node scripts/migrate-db.js
 * It reads MYSQL_* from .env and creates the two new tables.
 */

import { createPool } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (server doesn't have dotenv as a dep)
try {
  const envFile = readFileSync(resolve(__dirname, '../.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
} catch { /* .env not present — rely on existing env */ }

const pool = createPool({
  host:     process.env.MYSQL_HOST     || 'localhost',
  port:     Number(process.env.MYSQL_PORT) || 3306,
  database: process.env.MYSQL_DATABASE,
  user:     process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  multipleStatements: true,
});

const SQL = `
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
`;

try {
  await pool.query(SQL);
  console.log('✓ checkout_snapshots table ready');
  console.log('✓ orphan_payments table ready');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
