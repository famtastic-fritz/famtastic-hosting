/**
 * GET /api/admin/revenue
 *
 * Revenue dashboard aggregates for the admin command center.
 * - MTD revenue (current month to date) from GoDaddy /v1/orders
 * - Revenue by product category (best-effort label matching)
 * - Last 12 months of revenue (monthly totals) for the chart
 * - Active subscription count + MRR estimate from Supabase
 *
 * All GoDaddy prices are in MICRODOLLARS — microToUSD() converts them.
 * Server-side only. Requires admin role.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth/middleware.js';
import { apiOk, apiError, handleGoDaddyError } from '../../../lib/api/response.js';
import { listOrdersNormalized, getRevenueStats } from '../../../lib/godaddy/orders.js';
import { supabaseAdmin } from '../../../lib/supabase/client.js';

// Category label keywords (GoDaddy product labels contain these)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  domains:  ['domain', 'transfer', 'registration', '.com', '.net', '.org', '.co'],
  hosting:  ['hosting', 'web hosting', 'cpanel', 'shared', 'unlimited'],
  wordpress:['wordpress', 'managed wp', 'wp basic', 'wp ultimate'],
  email:    ['email', 'microsoft 365', 'office 365', 'group email', 'professional email'],
  ssl:      ['ssl', 'security certificate', 'ev cert', 'wildcard'],
  security: ['security', 'malware', 'website security', 'sucuri', 'waf'],
  builder:  ['website builder', 'builder essential', 'builder commerce'],
  servers:  ['vps', 'dedicated', 'server', 'hosting plus', 'expand', 'launch'],
  bundles:  ['bundle', 'package', 'starter', 'launch bundle'],
};

function categorizeProduct(label: string): string {
  const lower = label.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return 'other';
}

export const GET: APIRoute = async ({ request }) => {
  const auth = await requireAdmin(request);
  if (auth instanceof Response) return auth;

  try {
    // Date ranges
    const now = new Date();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const today = now.toISOString();

    // 12-month lookback for chart
    const twelveMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 11,
      1
    ).toISOString();

    // --- MTD revenue from GoDaddy /v1/orders ---
    const [mtdData, yearData] = await Promise.all([
      getRevenueStats(mtdStart, today),
      getRevenueStats(twelveMonthsAgo, today),
    ]);

    // --- Revenue by product category (from yearData) ---
    const byCategory: Record<string, number> = {};
    for (const product of yearData.topProducts) {
      const cat = categorizeProduct(product.label);
      byCategory[cat] = (byCategory[cat] ?? 0) + product.totalUSD;
    }

    // --- Active subscriptions + MRR from Supabase ---
    const { data: subRows, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, product_id')
      .eq('status', 'active');

    const activeSubscriptions = subError ? 0 : (subRows?.length ?? 0);

    // Get product prices to estimate MRR
    let mrrEstimate = 0;
    if (!subError && subRows && subRows.length > 0) {
      const productIds = [...new Set(subRows.map(s => s.product_id))];
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, retail_price, category')
        .in('id', productIds);

      if (products) {
        const priceMap = new Map(products.map(p => [p.id, p.retail_price]));
        for (const sub of subRows) {
          const price = priceMap.get(sub.product_id) ?? 0;
          mrrEstimate += price / 100; // retail_price is in cents
        }
      }
    }

    // --- Recent orders (last 10) for the feed ---
    const { orders: recentOrders } = await listOrdersNormalized({ limit: 10, skipCache: true });

    // Build monthly revenue series for chart (last 12 months)
    const monthlyRevenue: Array<{ month: string; revenueUSD: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue.push({
        month: key,
        revenueUSD: Math.round((yearData.byPeriod[key] ?? 0) * 100) / 100,
      });
    }

    return apiOk({
      mtd: {
        revenueUSD: mtdData.totalUSD,
        orderCount: mtdData.orderCount,
      },
      byCategory: Object.entries(byCategory)
        .map(([category, revenueUSD]) => ({ category, revenueUSD: Math.round(revenueUSD * 100) / 100 }))
        .sort((a, b) => b.revenueUSD - a.revenueUSD),
      monthlyRevenue,
      subscriptions: {
        active: activeSubscriptions,
        mrrEstimateUSD: Math.round(mrrEstimate * 100) / 100,
      },
      recentOrders: recentOrders.slice(0, 10).map(o => ({
        orderId: o.orderId,
        createdAt: o.createdAt,
        totalUSD: o.totalUSD,
        items: o.items.map(i => ({ label: i.label, quantity: i.quantity, unitPriceUSD: i.unitPriceUSD })),
      })),
    });
  } catch (err) {
    return handleGoDaddyError(err);
  }
};
