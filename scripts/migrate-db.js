#!/usr/bin/env node
/**
 * Guest-checkout DB upgrader for FAMtastic Hosting.
 *
 * Run on the server after deploying checkout/runtime changes:
 *   node scripts/migrate-db.js
 *
 * This script upgrades an existing database to the guest-checkout schema
 * expected by:
 * - src/pages/api/checkout/create-order.ts
 * - src/pages/api/checkout/capture-order.ts
 * - src/lib/cart/index.ts
 *
 * Canonical table shapes live in db/schema.sql.
 */

import { createPool } from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  for (const candidate of [
    resolve(__dirname, '../.env'),
    resolve(__dirname, '../../.env'),
  ]) {
    try {
      const envFile = readFileSync(candidate, 'utf8');
      for (const line of envFile.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
        if (!m) continue;
        const [, key, rawValue] = m;
        process.env[key] = rawValue.replace(/^['\"]|['\"]$/g, '').trim();
      }
      return candidate;
    } catch {
      // keep looking
    }
  }
  return null;
}

const loadedEnv = loadEnvFile();
if (loadedEnv) {
  console.log(`Loaded env from ${loadedEnv}`);
} else {
  console.log('No .env file found — relying on existing process env');
}

const database = process.env.MYSQL_DATABASE;
if (!database) {
  console.error('MYSQL_DATABASE is required');
  process.exit(1);
}

const pool = createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  database,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  multipleStatements: true,
});

async function queryRows(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function execute(sql, params = []) {
  await pool.execute(sql, params);
}

async function tableExists(tableName) {
  const rows = await queryRows(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?
      LIMIT 1`,
    [database, tableName],
  );
  return rows.length > 0;
}

async function getColumns(tableName) {
  const rows = await queryRows(
    `SELECT column_name, data_type, column_type, is_nullable, column_key, extra
       FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ?
      ORDER BY ordinal_position`,
    [database, tableName],
  );
  return new Map(rows.map((row) => [row.column_name, row]));
}

async function getIndexNames(tableName) {
  const rows = await queryRows(
    `SELECT DISTINCT index_name
       FROM information_schema.statistics
      WHERE table_schema = ? AND table_name = ?`,
    [database, tableName],
  );
  return new Set(rows.map((row) => row.index_name));
}

async function getForeignKey(tableName, columnName) {
  const rows = await queryRows(
    `SELECT kcu.constraint_name, rc.delete_rule
       FROM information_schema.key_column_usage kcu
       LEFT JOIN information_schema.referential_constraints rc
         ON rc.constraint_schema = kcu.constraint_schema
        AND rc.constraint_name = kcu.constraint_name
      WHERE kcu.table_schema = ?
        AND kcu.table_name = ?
        AND kcu.column_name = ?
        AND kcu.referenced_table_name IS NOT NULL
      LIMIT 1`,
    [database, tableName, columnName],
  );
  return rows[0] ?? null;
}

async function ensureOrdersGuestCheckout() {
  console.log('\n[orders] Ensuring guest checkout compatibility...');
  await execute(
    `ALTER TABLE orders
       MODIFY COLUMN user_id INT DEFAULT NULL COMMENT 'NULL = guest checkout (no account required)'`
  );

  const fk = await getForeignKey('orders', 'user_id');
  if (fk?.constraint_name && fk.delete_rule !== 'SET NULL') {
    console.log(`[orders] Replacing foreign key ${fk.constraint_name} to enforce ON DELETE SET NULL`);
    await execute(`ALTER TABLE orders DROP FOREIGN KEY \`${fk.constraint_name}\``);
  }

  const freshFk = await getForeignKey('orders', 'user_id');
  if (!freshFk) {
    console.log('[orders] Adding fk_orders_user_id with ON DELETE SET NULL');
    await execute(
      `ALTER TABLE orders
         ADD CONSTRAINT fk_orders_user_id
         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL`
    );
  }
}

function buildCreateCartItemsSql(tableName = 'cart_items') {
  return `
CREATE TABLE IF NOT EXISTS \`${tableName}\` (
  \`id\`          INT AUTO_INCREMENT PRIMARY KEY,
  \`session_id\`  VARCHAR(128) NOT NULL,
  \`product_id\`  INT NOT NULL,
  \`quantity\`    INT NOT NULL DEFAULT 1,
  \`user_id\`     INT DEFAULT NULL,
  \`created_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY \`uq_cart_session_product\` (\`session_id\`, \`product_id\`),
  KEY \`idx_cart_items_session_id\` (\`session_id\`),
  KEY \`idx_cart_items_user_id\` (\`user_id\`),
  CONSTRAINT \`fk_cart_items_product_id\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_cart_items_user_id\`    FOREIGN KEY (\`user_id\`)    REFERENCES \`users\`(\`id\`)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
}

async function ensureCartItems() {
  console.log('\n[cart_items] Ensuring cart table exists...');
  if (!(await tableExists('cart_items'))) {
    await execute(buildCreateCartItemsSql());
    console.log('[cart_items] Created');
    return;
  }
  console.log('[cart_items] Already exists; leaving in place');
}

function buildCreateCheckoutSnapshotsSql(tableName) {
  return `
CREATE TABLE \`${tableName}\` (
  \`id\`              INT AUTO_INCREMENT PRIMARY KEY,
  \`paypal_order_id\` VARCHAR(64) NOT NULL,
  \`session_id\`      VARCHAR(128) NOT NULL,
  \`subtotal_cents\`  INT NOT NULL,
  \`items_json\`      JSON NOT NULL,
  \`status\`          ENUM('pending','captured','expired') NOT NULL DEFAULT 'pending',
  \`created_at\`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY \`uq_checkout_snapshots_paypal_order_id\` (\`paypal_order_id\`),
  KEY \`idx_checkout_snapshots_session_id\` (\`session_id\`),
  KEY \`idx_checkout_snapshots_status\` (\`status\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
}

async function rebuildCheckoutSnapshotsIfNeeded() {
  console.log('\n[checkout_snapshots] Ensuring canonical schema...');
  if (!(await tableExists('checkout_snapshots'))) {
    await execute(buildCreateCheckoutSnapshotsSql('checkout_snapshots'));
    console.log('[checkout_snapshots] Created');
    return;
  }

  const columns = await getColumns('checkout_snapshots');
  const indexes = await getIndexNames('checkout_snapshots');
  const statusType = columns.get('status')?.column_type ?? '';
  const needsRebuild =
    !columns.has('id') ||
    columns.get('paypal_order_id')?.column_type !== 'varchar(64)' ||
    columns.get('items_json')?.data_type !== 'json' ||
    !statusType.includes("'expired'") ||
    statusType.includes("'abandoned'") ||
    !columns.has('updated_at') ||
    !indexes.has('uq_checkout_snapshots_paypal_order_id') ||
    !indexes.has('idx_checkout_snapshots_session_id') ||
    !indexes.has('idx_checkout_snapshots_status');

  if (!needsRebuild) {
    console.log('[checkout_snapshots] Already matches canonical schema');
    return;
  }

  console.log('[checkout_snapshots] Rebuilding stale table to canonical schema');
  await execute('DROP TABLE IF EXISTS checkout_snapshots__new');
  await execute(buildCreateCheckoutSnapshotsSql('checkout_snapshots__new'));
  await execute(`
    INSERT INTO checkout_snapshots__new
      (paypal_order_id, session_id, subtotal_cents, items_json, status, created_at, updated_at)
    SELECT
      CAST(paypal_order_id AS CHAR(64)),
      session_id,
      subtotal_cents,
      CASE
        WHEN items_json IS NULL OR TRIM(items_json) = '' THEN JSON_ARRAY()
        WHEN JSON_VALID(items_json) THEN items_json
        ELSE JSON_ARRAY()
      END,
      CASE
        WHEN status = 'abandoned' THEN 'expired'
        WHEN status IN ('pending','captured','expired') THEN status
        ELSE 'pending'
      END,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      CURRENT_TIMESTAMP
    FROM checkout_snapshots
  `);
  await execute('RENAME TABLE checkout_snapshots TO checkout_snapshots__old, checkout_snapshots__new TO checkout_snapshots');
  await execute('DROP TABLE checkout_snapshots__old');
  console.log('[checkout_snapshots] Rebuilt successfully');
}

function buildCreatePageContentSql(tableName) {
  return `
CREATE TABLE IF NOT EXISTS \`${tableName}\` (
  \`id\`          INT AUTO_INCREMENT PRIMARY KEY,
  \`page\`        VARCHAR(64) NOT NULL,
  \`section\`     VARCHAR(64) NOT NULL,
  \`key_name\`    VARCHAR(64) NOT NULL,
  \`value_text\`  LONGTEXT DEFAULT NULL,
  \`created_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY \`uq_page_content_page_section_key\` (\`page\`, \`section\`, \`key_name\`),
  KEY \`idx_page_content_page\` (\`page\`),
  KEY \`idx_page_content_section\` (\`page\`, \`section\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
}

const PAGE_CONTENT_SEED = [
  ['index', 'hero', 'prompt', '// famtastichosting.com'],
  ['index', 'hero', 'headline_line1', 'Your domain.'],
  ['index', 'hero', 'headline_line2', 'Your brand.'],
  ['index', 'hero', 'headline_line3', 'Handled.'],
  ['index', 'hero', 'subheadline', 'Premium hosting from $7/mo. Custom nameservers. Your brand on everything.'],
  ['index', 'hero', 'primary_cta', 'Explore Plans'],
  ['index', 'hero', 'primary_cta_url', '#products'],
  ['index', 'hero', 'secondary_cta', 'Contact Us'],
  ['index', 'hero', 'secondary_cta_url', '/contact'],
  ['index', 'trust_bar', 'item_1', '99.9% Uptime'],
  ['index', 'trust_bar', 'item_2', '1,000+ Sites Hosted'],
  ['index', 'trust_bar', 'item_3', 'Based in Miami, FL'],
  ['index', 'story_1', 'title', 'Hosting that stays out of your way'],
  ['index', 'story_1', 'body', 'You have a business to run. The last thing you need is a control panel that fights back or support that takes days. We built FAMtastic Hosting for people who want their site online, fast, with a brand that looks like theirs — not a reseller sticker.'],
  ['index', 'story_1', 'cta', 'See the difference'],
  ['index', 'story_1', 'cta_url', '/hosting'],
  ['index', 'story_2', 'title', 'Your brand on every touchpoint'],
  ['index', 'story_2', 'body', 'Custom nameservers. White-label support. SSL included. From the first click to the first invoice, your customers see you — not the wholesale provider behind the curtain.'],
  ['index', 'cross_promo_designs', 'title', 'Need a site to go with your hosting?'],
  ['index', 'cross_promo_designs', 'body', 'A lot of our clients came to us for hosting and left with a site they are proud of. FAMtastic Designs builds custom sites, logos, and brand packages for businesses that want to stand out.'],
  ['index', 'cross_promo_designs', 'cta', 'Talk to a designer'],
  ['index', 'cross_promo_designs', 'cta_url', 'https://famtasticdesigns.com'],
  ['index', 'cross_promo_thoughts', 'title', 'Running a site? Learn how to grow it.'],
  ['index', 'cross_promo_thoughts', 'body', 'FAMtastic Thoughts publishes real guides on hosting, design, domains, and running a business online. No fluff. No sales pitch. Just useful answers.'],
  ['index', 'cross_promo_thoughts', 'cta', 'Read the latest'],
  ['index', 'cross_promo_thoughts', 'cta_url', 'https://famtasticthoughts.com'],
];

async function ensurePageContent() {
  console.log('\n[page_content] Ensuring content editor table...');
  if (!(await tableExists('page_content'))) {
    await execute(buildCreatePageContentSql('page_content'));
    console.log('[page_content] Created');
  } else {
    console.log('[page_content] Already exists');
  }

  // Seed defaults idempotently
  for (const [page, section, key, value] of PAGE_CONTENT_SEED) {
    await execute(
      `INSERT INTO page_content (page, section, key_name, value_text)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
      [page, section, key, value]
    );
  }
  console.log('[page_content] Defaults seeded');
}

function buildCreateOrphanPaymentsSql(tableName) {
  return `
CREATE TABLE \`${tableName}\` (
  \`id\`                INT AUTO_INCREMENT PRIMARY KEY,
  \`paypal_order_id\`   VARCHAR(64) NOT NULL,
  \`session_id\`        VARCHAR(128) DEFAULT NULL,
  \`amount_captured\`   DECIMAL(10,2) NOT NULL,
  \`payer_email\`       VARCHAR(255) DEFAULT NULL,
  \`items_json\`        JSON DEFAULT NULL,
  \`error_msg\`         TEXT DEFAULT NULL,
  \`resolved\`          BOOLEAN NOT NULL DEFAULT FALSE,
  \`created_at\`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\`        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY \`uq_orphan_payments_paypal_order_id\` (\`paypal_order_id\`),
  KEY \`idx_orphan_payments_resolved\` (\`resolved\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
}

async function rebuildOrphanPaymentsIfNeeded() {
  console.log('\n[orphan_payments] Ensuring canonical schema...');
  if (!(await tableExists('orphan_payments'))) {
    await execute(buildCreateOrphanPaymentsSql('orphan_payments'));
    console.log('[orphan_payments] Created');
    return;
  }

  const columns = await getColumns('orphan_payments');
  const indexes = await getIndexNames('orphan_payments');
  const needsRebuild =
    columns.get('paypal_order_id')?.column_type !== 'varchar(64)' ||
    columns.get('session_id')?.is_nullable !== 'YES' ||
    (columns.get('items_json') && columns.get('items_json')?.data_type !== 'json') ||
    !columns.has('updated_at') ||
    !indexes.has('uq_orphan_payments_paypal_order_id') ||
    !indexes.has('idx_orphan_payments_resolved');

  if (!needsRebuild) {
    console.log('[orphan_payments] Already matches canonical schema');
    return;
  }

  console.log('[orphan_payments] Rebuilding stale table to canonical schema');
  await execute('DROP TABLE IF EXISTS orphan_payments__new');
  await execute(buildCreateOrphanPaymentsSql('orphan_payments__new'));
  await execute(`
    INSERT INTO orphan_payments__new
      (paypal_order_id, session_id, amount_captured, payer_email, items_json, error_msg, resolved, created_at, updated_at)
    SELECT
      CAST(paypal_order_id AS CHAR(64)),
      session_id,
      amount_captured,
      payer_email,
      CASE
        WHEN items_json IS NULL OR TRIM(items_json) = '' THEN NULL
        WHEN JSON_VALID(items_json) THEN items_json
        ELSE NULL
      END,
      error_msg,
      resolved,
      COALESCE(created_at, CURRENT_TIMESTAMP),
      CURRENT_TIMESTAMP
    FROM orphan_payments
  `);
  await execute('RENAME TABLE orphan_payments TO orphan_payments__old, orphan_payments__new TO orphan_payments');
  await execute('DROP TABLE orphan_payments__old');
  console.log('[orphan_payments] Rebuilt successfully');
}

async function main() {
  try {
    await ensurePageContent();
    await ensureOrdersGuestCheckout();
    await ensureCartItems();
    await rebuildCheckoutSnapshotsIfNeeded();
    await rebuildOrphanPaymentsIfNeeded();
    console.log('\nMigration complete.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\nMigration failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
