<script lang="ts">
  import StatusBadge from './StatusBadge.svelte';
  import type { StatusVariant } from './StatusBadge.svelte';

  export let title: string;
  export let subtitle: string = '';
  export let status: StatusVariant = 'active';
  export let renewalDate: string = '';
  export let actionLabel: string = 'Manage';
  export let actionHref: string = '#';
  export let iconType: 'domain' | 'hosting' | 'email' | 'ssl' | 'builder' = 'domain';

  // SVG icon paths keyed by type
  const iconPaths: Record<typeof iconType, string> = {
    domain: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
    hosting: 'M5 12H3m18 0h-2M5.636 5.636L4.222 4.222m15.556 15.556l-1.414-1.414M12 5V3m0 18v-2m6.364-13.364l-1.414 1.414M7.05 16.95l-1.414 1.414M12 17a5 5 0 100-10 5 5 0 000 10z',
    email: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    ssl: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    builder: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  };

  $: icon = iconPaths[iconType];
</script>

<div class="db-service-card">
  <div class="db-service-card__header">
    <div class="db-service-card__icon" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d={icon}/>
      </svg>
    </div>
    <div style="flex:1; min-width:0;">
      <p class="db-service-card__title db-truncate">{title}</p>
      {#if subtitle}
        <p class="db-service-card__domain db-truncate">{subtitle}</p>
      {/if}
    </div>
    <StatusBadge {status} />
  </div>

  {#if renewalDate}
    <div class="db-service-card__meta">
      <div class="db-service-card__row">
        <span class="db-service-card__row-label">Renewal</span>
        <span class="db-service-card__row-value">{renewalDate}</span>
      </div>
    </div>
  {/if}

  <div class="db-service-card__footer">
    <a href={actionHref} class="db-btn db-btn--secondary db-btn--sm">
      {actionLabel}
    </a>
    <slot name="extra-actions" />
  </div>
</div>
