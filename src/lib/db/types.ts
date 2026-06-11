/**
 * TypeScript interfaces for the FAMtastic Hosting MySQL schema.
 *
 * All id columns are INT (auto-increment), not UUID.
 * Timestamps are stored as DATETIME in UTC and represented as ISO 8601 strings.
 *
 * When a migration changes the schema, update these types to match.
 */

// ─── Enums / Unions ──────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'admin';

export type ProductCategory =
  | 'wordpress'
  | 'hosting'
  | 'builder'
  | 'servers'
  | 'domains'
  | 'email'
  | 'ssl'
  | 'security';

export type OrderStatus =
  | 'pending'
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'processing'
  | 'failed';

export type SubscriptionStatus =
  | 'active'
  | 'paused'
  | 'cancelled'
  | 'expired'
  | 'grace_period';

// ─── Row types (what SELECT returns) ─────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: UserRole;
  godaddy_shopper_id: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface Session {
  session_id: string;
  expires: number;   // Unix timestamp (seconds)
  data: string | null;
}

export interface Product {
  id: number;
  godaddy_product_id: string | null;
  name: string;
  category: ProductCategory;
  wholesale_price_cents: number;
  retail_price_cents: number;
  markup_pct: number;       // e.g. 75.00 = 75%
  billing_period: 'monthly' | 'annual' | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  user_id: number | null;  // NULL = guest checkout
  godaddy_order_id: string | null;
  product_id: number | null;
  status: OrderStatus;
  amount_cents: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  product_id: number;
  status: SubscriptionStatus;
  current_period_start: string; // ISO 8601
  current_period_end: string;   // ISO 8601
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
  resolved: boolean;
}

export interface AdminSetting {
  key: string;   // primary key — e.g. 'support_phone'
  value: string;
}

export interface GodaddyRenewal {
  id: number;
  user_id: number;
  godaddy_order_id: string;
  domain: string;
  product_type: string;
  renewal_date: string; // ISO 8601
  auto_renew: boolean;
  notified: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Insert types (what you pass to INSERT) ──────────────────────────────────

export type UserInsert = Omit<User, 'id' | 'created_at' | 'updated_at'>;
export type ProductInsert = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type OrderInsert = Omit<Order, 'id' | 'created_at' | 'updated_at'>;
export type SubscriptionInsert = Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
export type ContactSubmissionInsert = Omit<ContactSubmission, 'id' | 'created_at'>;
export type AdminSettingInsert = AdminSetting;
export type GodaddyRenewalInsert = Omit<GodaddyRenewal, 'id' | 'created_at' | 'updated_at'>;

// ─── Update types (partial, for PATCH/UPDATE) ────────────────────────────────

export type UserUpdate = Partial<Pick<User, 'email' | 'password_hash' | 'role' | 'godaddy_shopper_id' | 'updated_at'>>;
export type ProductUpdate = Partial<Pick<Product, 'name' | 'retail_price_cents' | 'markup_pct' | 'active' | 'updated_at'>>;
export type OrderUpdate = Partial<Pick<Order, 'status' | 'updated_at'>>;
export type SubscriptionUpdate = Partial<Pick<Subscription, 'status' | 'auto_renew' | 'current_period_end' | 'updated_at'>>;
export type ContactSubmissionUpdate = Partial<Pick<ContactSubmission, 'resolved'>>;
export type AdminSettingUpdate = Partial<Pick<AdminSetting, 'value'>>;