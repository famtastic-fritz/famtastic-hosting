<script lang="ts">
  /**
   * ContactPhone — displays (480) 624-2500 with click-to-call link.
   * variant "block" = large pill block (used in support sections)
   * variant "inline" = compact inline link (used in topbar / sidebar footer)
   * variant "sidebar" = slim sidebar footer version
   */
  export type PhoneVariant = 'block' | 'inline' | 'sidebar';
  export let variant: PhoneVariant = 'block';

  const phone = '(480) 624-2500';
  const href  = 'tel:+14806242500';
</script>

{#if variant === 'block'}
  <a {href} class="db-phone-block" aria-label="Call FAMtastic Hosting support at {phone}">
    <span class="db-phone-block__icon" aria-hidden="true">
      <!-- phone icon -->
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69H6.6a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.3A16 16 0 0 0 13.7 16.1l.9-.89a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.22 17a2 2 0 0 1 .78 1.54z"/>
      </svg>
    </span>
    <span>
      <div class="db-phone-block__label">24/7 Support</div>
      <div class="db-phone-block__number">{phone}</div>
      <div class="db-phone-block__sub">FAMtastic Hosting Support</div>
    </span>
  </a>

{:else if variant === 'sidebar'}
  <a {href} class="db-sidebar-phone" aria-label="Call support at {phone}">
    <span class="db-sidebar-phone__icon" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69H6.6a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.3A16 16 0 0 0 13.7 16.1l.9-.89a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.22 17a2 2 0 0 1 .78 1.54z"/>
      </svg>
    </span>
    <span class="db-sidebar-phone__text">
      <span class="db-sidebar-phone__label">24/7 Support</span>
      <span class="db-sidebar-phone__number">{phone}</span>
    </span>
  </a>

{:else}
  <!-- inline variant -->
  <a {href} class="db-phone-inline" aria-label="Call {phone}">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69H6.6a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.3A16 16 0 0 0 13.7 16.1l.9-.89a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.22 17a2 2 0 0 1 .78 1.54z"/>
    </svg>
    {phone}
  </a>
{/if}

<style>
  .db-phone-inline {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #22c55e;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    transition: opacity 0.15s ease;
  }
  .db-phone-inline:hover { opacity: 0.8; }
</style>
