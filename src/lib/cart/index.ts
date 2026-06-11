/**
 * Cart library — FAMtastic Hosting
 *
 * Session-keyed shopping cart backed by the cart_items MySQL table.
 * All operations accept a sessionId (the fam_cart_session cookie value).
 * userId is optional — supplied when the user is authenticated so the row
 * gets linked to their account for future order association.
 */

import { query } from '../db/pool.js';
import type { RowDataPacket } from 'mysql2';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: number;
  product_id: number;
  name: string;
  retail_price_cents: number;
  quantity: number;
}

export interface CartSummary {
  items: CartItem[];
  count: number;
  subtotalCents: number;
}

// ─── getCart ──────────────────────────────────────────────────────────────────

/**
 * Return all cart items for a session, joined with product details.
 */
export async function getCart(sessionId: string): Promise<CartItem[]> {
  const [rows] = await query<(CartItem & RowDataPacket)[]>(
    `SELECT ci.id, ci.product_id, p.name, p.retail_price_cents, ci.quantity
     FROM cart_items ci
     JOIN products p ON p.id = ci.product_id
     WHERE ci.session_id = ?
     ORDER BY ci.created_at ASC`,
    [sessionId],
  );
  return rows as CartItem[];
}

// ─── addToCart ────────────────────────────────────────────────────────────────

/**
 * Add a product to the cart, or increment quantity if already present.
 * Uses ON DUPLICATE KEY UPDATE so the (session_id, product_id) unique key
 * prevents duplicates while accumulating quantity.
 */
export async function addToCart(
  sessionId: string,
  productId: number,
  quantity: number,
  userId?: number | null,
): Promise<void> {
  await query(
    `INSERT INTO cart_items (session_id, product_id, quantity, user_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       quantity  = quantity + VALUES(quantity),
       user_id   = COALESCE(VALUES(user_id), user_id),
       updated_at = NOW()`,
    [sessionId, productId, quantity, userId ?? null],
  );
}

// ─── updateCartItem ───────────────────────────────────────────────────────────

/**
 * Set an item's quantity. Always matches both id AND session_id to prevent IDOR.
 * If quantity <= 0, the item is removed.
 */
export async function updateCartItem(
  itemId: number,
  quantity: number,
  sessionId: string,
): Promise<void> {
  if (quantity <= 0) {
    await removeCartItem(itemId, sessionId);
    return;
  }
  await query(
    `UPDATE cart_items SET quantity = ?, updated_at = NOW()
     WHERE id = ? AND session_id = ?`,
    [quantity, itemId, sessionId],
  );
}

// ─── removeCartItem ───────────────────────────────────────────────────────────

/**
 * Delete a single cart item. Matches both id AND session_id to prevent IDOR.
 */
export async function removeCartItem(
  itemId: number,
  sessionId: string,
): Promise<void> {
  await query(
    `DELETE FROM cart_items WHERE id = ? AND session_id = ?`,
    [itemId, sessionId],
  );
}

// ─── clearCart ────────────────────────────────────────────────────────────────

/**
 * Remove all items for a session.
 */
export async function clearCart(sessionId: string): Promise<void> {
  await query(`DELETE FROM cart_items WHERE session_id = ?`, [sessionId]);
}

// ─── getCartCount ─────────────────────────────────────────────────────────────

/**
 * Return the total quantity of all items in the cart (sum, not row count).
 */
export async function getCartCount(sessionId: string): Promise<number> {
  interface CountRow extends RowDataPacket {
    total: number | null;
  }
  const [rows] = await query<CountRow[]>(
    `SELECT SUM(quantity) AS total FROM cart_items WHERE session_id = ?`,
    [sessionId],
  );
  return Number(rows[0]?.total ?? 0);
}

// ─── buildSummary ─────────────────────────────────────────────────────────────

/**
 * Convenience helper: fetch cart items and compute totals in one call.
 */
export async function buildCartSummary(sessionId: string): Promise<CartSummary> {
  const items = await getCart(sessionId);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalCents = items.reduce(
    (sum, i) => sum + i.retail_price_cents * i.quantity,
    0,
  );
  return { items, count, subtotalCents };
}
