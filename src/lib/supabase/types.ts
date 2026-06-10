/**
 * TypeScript types for the FAMtastic Hosting database schema.
 *
 * These match the Supabase migrations in /supabase/migrations/.
 * When a migration changes the schema, update these types to match.
 *
 * Usage with the Supabase client:
 *   createClient<Database>(url, key)
 *
 * Then queries are fully typed:
 *   const { data } = await supabase.from('users').select('*')
 *   // data is Database['public']['Tables']['users']['Row'][]
 */

// ─── Row types (what Supabase returns from SELECT) ────────────────────────────

export interface UserRow {
  id: string;                          // uuid, matches auth.users.id
  email: string;
  role: 'customer' | 'admin';
  godaddy_shopper_id: string | null;
  created_at: string;                  // ISO 8601
  updated_at: string;                  // ISO 8601
}

export interface ProductRow {
  id: string;                          // uuid
  godaddy_product_id: string | null;
  name: string;
  category: ProductCategory;
  wholesale_price: number;             // in cents
  retail_price: number;                // in cents
  markup_pct: number;                  // e.g. 175 = 175%
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductCategory =
  | 'domain'
  | 'hosting'
  | 'wordpress'
  | 'builder'
  | 'email'
  | 'ssl'
  | 'security'
  | 'server'
  | 'bundle';

export interface OrderRow {
  id: string;                          // uuid
  user_id: string;                     // uuid → users.id
  godaddy_order_id: string | null;
  product_id: string | null;          // uuid → products.id
  status: OrderStatus;
  amount_cents: number;               // our retail price in cents
  created_at: string;
}

export type OrderStatus =
  | 'pending'
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export interface SubscriptionRow {
  id: string;                          // uuid
  user_id: string;                     // uuid → users.id
  product_id: string;                  // uuid → products.id
  status: SubscriptionStatus;
  current_period_start: string;        // ISO 8601
  current_period_end: string;          // ISO 8601
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'cancelled'
  | 'pending';

export interface ContactSubmissionRow {
  id: string;                          // uuid
  name: string;
  email: string;
  subject: string | null;
  message: string;
  created_at: string;
  resolved: boolean;
}

export interface AdminSettingRow {
  key: string;                         // primary key — e.g. 'support_phone'
  value: string;
}

// ─── Insert types (what you pass to INSERT) ───────────────────────────────────

export type UserInsert = Omit<UserRow, 'created_at' | 'updated_at'>;
export type ProductInsert = Omit<ProductRow, 'id' | 'created_at' | 'updated_at'>;
export type OrderInsert = Omit<OrderRow, 'id' | 'created_at'>;
export type SubscriptionInsert = Omit<SubscriptionRow, 'id' | 'created_at' | 'updated_at'>;
export type ContactSubmissionInsert = Omit<ContactSubmissionRow, 'id' | 'created_at'>;

// ─── Update types (partial, for PATCH/UPDATE) ─────────────────────────────────

export type UserUpdate = Partial<Pick<UserRow, 'role' | 'godaddy_shopper_id' | 'updated_at'>>;
export type ProductUpdate = Partial<Pick<ProductRow, 'name' | 'retail_price' | 'markup_pct' | 'active' | 'updated_at'>>;
export type OrderUpdate = Partial<Pick<OrderRow, 'status'>>;
export type SubscriptionUpdate = Partial<Pick<SubscriptionRow, 'status' | 'auto_renew' | 'current_period_end' | 'updated_at'>>;

// ─── Database shape for createClient<Database>() ─────────────────────────────

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      products: {
        Row: ProductRow;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      orders: {
        Row: OrderRow;
        Insert: OrderInsert;
        Update: OrderUpdate;
      };
      subscriptions: {
        Row: SubscriptionRow;
        Insert: SubscriptionInsert;
        Update: SubscriptionUpdate;
      };
      contact_submissions: {
        Row: ContactSubmissionRow;
        Insert: ContactSubmissionInsert;
        Update: Partial<Pick<ContactSubmissionRow, 'resolved'>>;
      };
      admin_settings: {
        Row: AdminSettingRow;
        Insert: AdminSettingRow;
        Update: Partial<Pick<AdminSettingRow, 'value'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
