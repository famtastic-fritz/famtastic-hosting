<script lang="ts">
  export interface RevenueDataPoint {
    label: string;    // e.g. "Jan", "Feb", or "Week 1"
    value: number;    // USD amount
    isCurrent?: boolean;
  }

  export let data: RevenueDataPoint[] = [];
  export let title: string = 'Revenue MTD';
  export let subtitle: string = '';
  export let currency: string = '$';

  // Derived
  $: maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 1;
  $: totalRevenue = data.reduce((sum, d) => sum + d.value, 0);

  function barHeight(value: number): string {
    if (maxValue === 0) return '4px';
    const pct = Math.max(value / maxValue, 0.02); // min 2% so zero bars show
    return `${Math.round(pct * 100)}%`;
  }

  function formatCurrency(n: number): string {
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
    return `$${n.toFixed(0)}`;
  }
</script>

<div class="db-chart">
  <div class="db-chart__header">
    <div>
      <h3 class="db-chart__title">{title}</h3>
      {#if subtitle}
        <p class="db-chart__subtitle">{subtitle}</p>
      {/if}
    </div>
    <div style="text-align: right;">
      <div style="font-family: var(--db-font-heading); font-size: 1.5rem; font-weight: 700; color: var(--db-text-primary); letter-spacing: -0.02em;">
        {currency}{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div style="font-size: 0.75rem; color: var(--db-text-muted); font-family: var(--db-font-mono);">TOTAL</div>
    </div>
  </div>

  {#if data.length === 0}
    <div class="chart-empty">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
      <p>No revenue data yet</p>
    </div>
  {:else}
    <div class="db-bar-chart" role="img" aria-label="Bar chart: {title}">
      {#each data as point (point.label)}
        <div class="db-bar-chart__bar-wrap">
          <div
            class="db-bar-chart__bar {point.isCurrent ? 'db-bar-chart__bar--current' : ''}"
            style="height: {barHeight(point.value)};"
            role="presentation"
            title="{point.label}: {currency}{point.value.toFixed(2)}"
          >
            <div class="db-bar-chart__bar-tooltip">
              {point.label}: {formatCurrency(point.value)}
            </div>
          </div>
          <span class="db-bar-chart__label">{point.label}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .chart-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 48px 16px;
    color: var(--db-text-muted);
    font-size: 0.875rem;
  }
  .chart-empty svg { opacity: 0.4; }
</style>
