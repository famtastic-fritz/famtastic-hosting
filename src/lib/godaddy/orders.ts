/**
 * GoDaddy Order History
 * SERVER-SIDE ONLY.
 *
 * CRITICAL: All monetary values from GoDaddy are in MICRODOLLARS.
 * Always divide by 1,000,000 to get USD. Use microToUSD() helper from types.ts.
 *
 * Endpoints:
 *   GET /v1/orders          → list orders (works with sso-key)
 *   GET /v1/orders/{id}     → single order detail
 *
 * NOTE: /v1/reseller/orders does NOT exist — returns 404.
 * NOTE: /v1/shoppers/self returns 403 with sso-key.
 * Use /v1/orders for all financial reporting.
 */

import { godaddyFetch, CACHE_TTL } from './client.js';
import type {
  GoDaddyOrder,
  GoDaddyOrdersListResponse,
  NormalizedOrder,
  NormalizedOrderItem,
} from './types.js';
import { microToUSD } from './types.js';

// ─── List Orders ──────────────────────────────────────────────────────────────

export interface ListOrdersOptions {
  /** Maximum number of orders to return (default 25, max 10000) */
  limit?: number;
  /** Pagination offset */
  offset?: number;
  /** Filter orders at or after this date (ISO 8601) */
  dateStart?: string;
  /** Filter orders at or before this date (ISO 8601) */
  dateEnd?: string;
  /** Filter by domain name */
  domain?: string;
  /** Skip cache (useful for real-time dashboards) */
  skipCache?: boolean;
}

/**
 * Fetch all orders for the reseller account.
 * Returns raw GoDaddy order objects — prices are in MICRODOLLARS.
 * Use listOrdersNormalized() to get prices converted to USD.
 */
export async function listOrders(
  options: ListOrdersOptions = {}
): Promise<GoDaddyOrdersListResponse> {
  const {
    limit = 25,
    offset = 0,
    dateStart,
    dateEnd,
    domain,
    skipCache = false,
  } = options;

  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (dateStart) params.set('dateStart', dateStart);
  if (dateEnd) params.set('dateEnd', dateEnd);
  if (domain) params.set('domain', domain);

  const qs = params.toString();
  const cacheKey = `GET:orders:list:${qs}`;

  return godaddyFetch<GoDaddyOrdersListResponse>(`/orders?${qs}`, {
    skipCache,
    cacheTTL: CACHE_TTL.ORDERS,
    cacheKey,
  });
}

/**
 * Fetch orders with prices normalized to USD.
 * Raw microdollar prices are still available on each item for debugging.
 */
export async function listOrdersNormalized(
  options: ListOrdersOptions = {}
): Promise<{ orders: NormalizedOrder[]; total: number }> {
  const response = await listOrders(options);
  return {
    orders: response.orders.map(normalizeOrder),
    total: response.pagination?.total ?? response.orders.length,
  };
}

// ─── Get Single Order ─────────────────────────────────────────────────────────

/**
 * Fetch a single order by ID.
 * Returns raw GoDaddy order with MICRODOLLAR pricing.
 */
export async function getOrder(
  orderId: string | number,
  skipCache = false
): Promise<GoDaddyOrder> {
  const cacheKey = `GET:orders:detail:${orderId}`;

  return godaddyFetch<GoDaddyOrder>(`/orders/${orderId}`, {
    skipCache,
    cacheTTL: CACHE_TTL.ORDERS,
    cacheKey,
  });
}

/**
 * Fetch a single order with prices normalized to USD.
 */
export async function getOrderNormalized(
  orderId: string | number,
  skipCache = false
): Promise<NormalizedOrder> {
  const raw = await getOrder(orderId, skipCache);
  return normalizeOrder(raw);
}

// ─── Revenue Aggregation ──────────────────────────────────────────────────────

export interface RevenueStats {
  totalUSD: number;
  orderCount: number;
  byPeriod: Record<string, number>; // 'YYYY-MM' → USD total
  topProducts: Array<{ label: string; totalUSD: number; count: number }>;
}

/**
 * Aggregate revenue stats for a date range.
 * Fetches all orders in the range and computes totals in USD.
 */
export async function getRevenueStats(
  dateStart: string,
  dateEnd: string
): Promise<RevenueStats> {
  // Fetch up to 10,000 orders for the range (GoDaddy max per call)
  const { orders } = await listOrdersNormalized({
    dateStart,
    dateEnd,
    limit: 10000,
    skipCache: true,
  });

  let totalUSD = 0;
  const byPeriod: Record<string, number> = {};
  const productMap = new Map<string, { totalUSD: number; count: number }>();

  for (const order of orders) {
    totalUSD += order.totalUSD;

    // Group by month (YYYY-MM)
    const month = order.createdAt.slice(0, 7);
    byPeriod[month] = (byPeriod[month] ?? 0) + order.totalUSD;

    // Aggregate by product label
    for (const item of order.items) {
      const label = item.label;
      const existing = productMap.get(label) ?? { totalUSD: 0, count: 0 };
      productMap.set(label, {
        totalUSD: existing.totalUSD + item.unitPriceUSD * item.quantity,
        count: existing.count + item.quantity,
      });
    }
  }

  const topProducts = Array.from(productMap.entries())
    .map(([label, stats]) => ({ label, ...stats }))
    .sort((a, b) => b.totalUSD - a.totalUSD)
    .slice(0, 10);

  return {
    totalUSD: Math.round(totalUSD * 100) / 100,
    orderCount: orders.length,
    byPeriod,
    topProducts,
  };
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Convert a raw GoDaddy order (microdollar pricing) to USD pricing.
 */
export function normalizeOrder(raw: GoDaddyOrder): NormalizedOrder {
  return {
    orderId: raw.orderId,
    createdAt: raw.createdAt,
    currency: raw.currency,
    totalUSD: microToUSD(raw.pricing?.total ?? 0),
    subtotalUSD: microToUSD(raw.pricing?.subtotal ?? 0),
    taxesUSD: microToUSD(raw.pricing?.taxes ?? 0),
    items: (raw.items ?? []).map(
      (item): NormalizedOrderItem => ({
        orderItemId: item.orderItemId,
        label: item.product?.label ?? 'Unknown Product',
        quantity: item.quantity,
        unitPriceUSD: microToUSD(item.pricing?.unit ?? 0),
        period: item.period,
        periodUnit: item.periodUnit,
      })
    ),
  };
}
