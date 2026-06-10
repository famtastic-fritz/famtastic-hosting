<script lang="ts">
  export interface PricingTier {
    id: string;
    name: string;
    description?: string;
    price: number;          // retail price (what customer sees)
    period: 'mo' | 'yr';
    features: string[];
    featured?: boolean;
    ctaLabel?: string;
    ctaHref?: string;
  }

  export let tiers: PricingTier[] = [];
  export let showAdminMargin: boolean = false; // admin only — never expose to customers
  export let wholesalePrices: Record<string, number> = {}; // populated only in admin context
</script>

<div class="db-pricing-grid">
  {#each tiers as tier (tier.id)}
    <div class="db-pricing-card {tier.featured ? 'db-pricing-card--featured' : ''}">
      <div>
        <h3 class="db-pricing-card__name">{tier.name}</h3>
        {#if tier.description}
          <p class="db-pricing-card__desc">{tier.description}</p>
        {/if}
      </div>

      <div class="db-pricing-card__price">
        <span class="db-pricing-card__currency">$</span>
        <span class="db-pricing-card__amount">{tier.price}</span>
        <span class="db-pricing-card__period">/{tier.period}</span>
      </div>

      {#if showAdminMargin && wholesalePrices[tier.id] !== undefined}
        <div class="admin-margin" aria-label="Wholesale vs retail margin">
          <span class="admin-margin__label">Wholesale:</span>
          <span class="admin-margin__value">${wholesalePrices[tier.id].toFixed(2)}/{tier.period}</span>
          <span class="admin-margin__pct">
            +{(((tier.price - wholesalePrices[tier.id]) / wholesalePrices[tier.id]) * 100).toFixed(0)}% margin
          </span>
        </div>
      {/if}

      <ul class="db-pricing-card__features" role="list">
        {#each tier.features as feature}
          <li class="db-pricing-card__feature">
            <span class="db-pricing-card__feature-check" aria-hidden="true">✓</span>
            {feature}
          </li>
        {/each}
      </ul>

      {#if tier.ctaHref}
        <a
          href={tier.ctaHref}
          class="db-btn {tier.featured ? 'db-btn--primary' : 'db-btn--secondary'}"
          aria-label="Get {tier.name} for ${tier.price}/{tier.period}"
        >
          {tier.ctaLabel ?? 'Get Started'}
        </a>
      {/if}
    </div>
  {/each}
</div>

<style>
  .admin-margin {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
  }
  .admin-margin__label { color: #6366f1; opacity: 0.7; }
  .admin-margin__value { color: #a0a0b0; }
  .admin-margin__pct {
    color: #22c55e;
    margin-left: auto;
    font-weight: 600;
  }
</style>
