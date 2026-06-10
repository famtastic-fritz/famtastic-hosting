/**
 * Table and column name constants for type-safe SQL queries.
 *
 * Usage:
 *   import { tables, cols } from '@/lib/db/schema';
 *   await query(`SELECT ${cols.users.email} FROM ${tables.users} WHERE ${cols.users.id} = ?`, [1]);
 *
 * This avoids magic strings in queries and makes renames safe via Find & Replace.
 */

// ─── Table names ──────────────────────────────────────────────────────────────

export const tables = {
  users: 'users',
  sessions: 'sessions',
  products: 'products',
  orders: 'orders',
  subscriptions: 'subscriptions',
  contact_submissions: 'contact_submissions',
  admin_settings: 'admin_settings',
  godaddy_renewals: 'godaddy_renewals',
} as const;

// ─── Column names ────────────────────────────────────────────────────────────

export const cols = {
  users: {
    id: 'id',
    email: 'email',
    password_hash: 'password_hash',
    role: 'role',
    godaddy_shopper_id: 'godaddy_shopper_id',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },

  sessions: {
    id: 'id',
    user_id: 'user_id',
    ip_address: 'ip_address',
    user_agent: 'user_agent',
    expires_at: 'expires_at',
    created_at: 'created_at',
  },

  products: {
    id: 'id',
    godaddy_product_id: 'godaddy_product_id',
    name: 'name',
    category: 'category',
    wholesale_price: 'wholesale_price',
    retail_price: 'retail_price',
    markup_pct: 'markup_pct',
    active: 'active',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },

  orders: {
    id: 'id',
    user_id: 'user_id',
    godaddy_order_id: 'godaddy_order_id',
    product_id: 'product_id',
    status: 'status',
    amount_cents: 'amount_cents',
    created_at: 'created_at',
  },

  subscriptions: {
    id: 'id',
    user_id: 'user_id',
    product_id: 'product_id',
    status: 'status',
    current_period_start: 'current_period_start',
    current_period_end: 'current_period_end',
    auto_renew: 'auto_renew',
    created_at: 'created_at',
    updated_at: 'updated_at',
  },

  contact_submissions: {
    id: 'id',
    name: 'name',
    email: 'email',
    subject: 'subject',
    message: 'message',
    created_at: 'created_at',
    resolved: 'resolved',
  },

  admin_settings: {
    key: 'key',
    value: 'value',
  },

  godaddy_renewals: {
    id: 'id',
    subscription_id: 'subscription_id',
    godaddy_order_id: 'godaddy_order_id',
    status: 'status',
    attempted_at: 'attempted_at',
    completed_at: 'completed_at',
  },
} as const;