/**
 * TypeScript interfaces for GoDaddy Reseller API responses.
 * All types are server-side only — never exported to client bundles.
 */

// ─── Domain Types ────────────────────────────────────────────────────────────

export interface GoDaddyDomain {
  domain: string;
  domainId: number;
  status: DomainStatus;
  expires: string;          // ISO 8601
  createdAt: string;        // ISO 8601
  renewAuto: boolean;
  renewable: boolean;
  transferProtected: boolean;
  locked: boolean;
  privacy: boolean;
  holdRegistrar: boolean;
  deleteAfterExpiration: boolean;
  registrar?: string;
  nameServers?: string[];
  contactRegistrant?: GoDaddyContact;
  contactAdmin?: GoDaddyContact;
  contactTech?: GoDaddyContact;
  contactBilling?: GoDaddyContact;
  authCode?: string;
  expirationProtected?: boolean;
}

export type DomainStatus =
  | 'ACTIVE'
  | 'AWAITING_DOCUMENT_UPLOADS'
  | 'AWAITING_VERIFICATION_ICANN'
  | 'AWAITING_VERIFICATION_ICANN_MANUAL'
  | 'CANCELLED'
  | 'CANCELLED_DURING_RESTORE'
  | 'CANCELLED_TRANSFER'
  | 'DELETED'
  | 'DISABLED_ICANN'
  | 'EXCLUDED_DOMAIN'
  | 'EXPIRED'
  | 'EXPIRED_AWAITING_DELETION'
  | 'FAILED_ICANN'
  | 'HOLD_OTHER'
  | 'HOLD_PAYMENT'
  | 'HOLD_REGISTRAR'
  | 'INACTIVE'
  | 'PARKED_BY_REGISTRAR'
  | 'PENDING_DELETION'
  | 'PENDING_DNS_ACTIVE'
  | 'PENDING_ICANN'
  | 'PENDING_REGISTRY'
  | 'PENDING_RENEWAL'
  | 'PENDING_RESTORE'
  | 'PENDING_TRANSFER'
  | 'PENDING_TRANSFER_LOCK'
  | 'RESERVED'
  | 'REVERTED'
  | 'SUSPENDED_OTHER'
  | 'TRANSFER_FAILED'
  | 'TRANSFER_FLAG'
  | 'UNKNOWN'
  | 'UNLOCKED_TRANSFER'
  | 'UNVERIFIED_REGISTRANT';

export interface GoDaddyContact {
  nameFirst: string;
  nameLast: string;
  email: string;
  phone: string;
  addressMailing: GoDaddyAddress;
  organization?: string;
  nameMiddle?: string;
  fax?: string;
  jobTitle?: string;
}

export interface GoDaddyAddress {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// ─── DNS Record Types ─────────────────────────────────────────────────────────

export interface GoDaddyDNSRecord {
  type: DNSRecordType;
  name: string;
  data: string;
  ttl: number;
  priority?: number;    // MX, SRV
  service?: string;     // SRV
  protocol?: string;    // SRV
  port?: number;        // SRV
  weight?: number;      // SRV
}

export type DNSRecordType =
  | 'A'
  | 'AAAA'
  | 'CAA'
  | 'CNAME'
  | 'MX'
  | 'NS'
  | 'SOA'
  | 'SRV'
  | 'TXT';

export interface DNSRecordInput {
  data: string;
  ttl?: number;
  priority?: number;
  service?: string;
  protocol?: string;
  port?: number;
  weight?: number;
}

// ─── Order Types ──────────────────────────────────────────────────────────────

/**
 * GoDaddy orders API response.
 * IMPORTANT: All monetary values (pricing) are in MICRODOLLARS.
 * Divide by 1,000,000 to get USD. E.g., 12000000 = $12.00
 */
export interface GoDaddyOrder {
  orderId: number;
  shopperGroupId: string;
  createdAt: string;    // ISO 8601
  currency: string;
  pricing: GoDaddyOrderPricing;
  items: GoDaddyOrderItem[];
  domainName?: string;
  parentOrderId?: number;
}

export interface GoDaddyOrderPricing {
  /** Total in MICRODOLLARS — divide by 1_000_000 for USD */
  total: number;
  /** Subtotal in MICRODOLLARS */
  subtotal: number;
  /** Tax in MICRODOLLARS */
  taxes: number;
  /** Fees in MICRODOLLARS */
  fees: GoDaddyOrderFees;
}

export interface GoDaddyOrderFees {
  /** ICANN fee in MICRODOLLARS */
  icann?: number;
  /** Processing fee in MICRODOLLARS */
  processing?: number;
}

export interface GoDaddyOrderItem {
  orderItemId: number;
  product: GoDaddyOrderProduct;
  quantity: number;
  pricing: GoDaddyItemPricing;
  domains?: GoDaddyOrderDomain[];
  period?: number;
  periodUnit?: 'YEAR' | 'MONTH';
}

export interface GoDaddyOrderProduct {
  productId: number;
  label: string;
  namespace: string;
  pfid?: number;
}

export interface GoDaddyItemPricing {
  /** Unit price in MICRODOLLARS */
  unit: number;
  /** List price in MICRODOLLARS */
  list?: number;
  /** Sale price in MICRODOLLARS */
  sale?: number;
  /** Savings in MICRODOLLARS */
  savings?: number;
}

export interface GoDaddyOrderDomain {
  domain: string;
  duration: number;
  externalId: string;
}

/** Convenience type: order with prices already converted to USD cents */
export interface NormalizedOrder {
  orderId: number;
  createdAt: string;
  currency: string;
  /** Total in USD (dollars, 2 decimal places) */
  totalUSD: number;
  /** Subtotal in USD */
  subtotalUSD: number;
  /** Tax in USD */
  taxesUSD: number;
  items: NormalizedOrderItem[];
}

export interface NormalizedOrderItem {
  orderItemId: number;
  label: string;
  quantity: number;
  /** Unit price in USD */
  unitPriceUSD: number;
  period?: number;
  periodUnit?: 'YEAR' | 'MONTH';
}

// ─── Product Types ────────────────────────────────────────────────────────────

export interface GoDaddyProduct {
  productId: number;
  namespace: string;
  pfid?: number;
  label: string;
  supportedTlds?: string[];
  pricing?: GoDaddyProductPricing[];
  productGroupKeys?: string[];
}

export interface GoDaddyProductPricing {
  currency: string;
  tiers: GoDaddyPricingTier[];
}

export interface GoDaddyPricingTier {
  /** Price in MICRODOLLARS */
  price: number;
  period: number;
  periodUnit: 'YEAR' | 'MONTH';
  /** Age in months for promotional pricing */
  promoMinAge?: number;
  promoMaxAge?: number;
}

// ─── Domain Availability Types ────────────────────────────────────────────────

export interface DomainAvailabilityResult {
  domain: string;
  available: boolean;
  definitive: boolean;
  currency: string;
  /** Price in MICRODOLLARS */
  price?: number;
  /** Price in USD (normalized) */
  priceUSD?: number;
  period?: number;
  periodUnit?: 'YEAR' | 'MONTH';
}

export interface DomainAvailabilityResponse {
  available: boolean;
  currency: string;
  definitive: boolean;
  domain: string;
  /** Price in MICRODOLLARS */
  price: number;
  period: number;
  periodUnit: 'YEAR' | 'MONTH';
}

// ─── Error Types ──────────────────────────────────────────────────────────────

export interface GoDaddyAPIError {
  code: string;
  message: string;
  fields?: GoDaddyFieldError[];
  stack?: string;
}

export interface GoDaddyFieldError {
  code: string;
  message: string;
  path: string;
  pathRelated?: string;
}

export class GoDaddyError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly fields?: GoDaddyFieldError[];
  public readonly retryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    retryable = false,
    fields?: GoDaddyFieldError[]
  ) {
    super(message);
    this.name = 'GoDaddyError';
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
    this.fields = fields;
  }
}

// ─── List Response Wrappers ───────────────────────────────────────────────────

export interface GoDaddyDomainsListResponse {
  domains: GoDaddyDomain[];
}

export interface GoDaddyOrdersListResponse {
  orders: GoDaddyOrder[];
  pagination: {
    total: number;
    page: number;
    count: number;
  };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Convert MICRODOLLARS to USD (number with 2 decimal precision) */
export function microToUSD(microdollars: number): number {
  return Math.round(microdollars / 10000) / 100;
}

/** Convert USD to MICRODOLLARS */
export function usdToMicro(usd: number): number {
  return Math.round(usd * 1_000_000);
}
