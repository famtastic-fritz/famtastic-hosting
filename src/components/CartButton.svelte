<script lang="ts">
  import { onMount } from 'svelte';
  import CartDrawer from './CartDrawer.svelte';

  let count = 0;
  let drawerRef: CartDrawer;

  async function refreshCount() {
    try {
      const res = await fetch('/api/cart');
      if (res.ok) {
        const data = await res.json();
        count = data.count ?? 0;
      }
    } catch {
      // ignore — badge stays at 0
    }
  }

  onMount(() => {
    refreshCount();
    window.addEventListener('fam:cart:updated', refreshCount);
    return () => {
      window.removeEventListener('fam:cart:updated', refreshCount);
    };
  });

  function handleCartClick() {
    drawerRef.openDrawer();
  }
</script>

<button
  class="fam-cart-btn"
  on:click={handleCartClick}
  aria-label={`Shopping cart${count > 0 ? `, ${count} item${count !== 1 ? 's' : ''}` : ''}`}
>
  <!-- Shopping bag icon -->
  <svg
    class="fam-cart-icon"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M6 2L3 6v12a2 2 0 002 2h10a2 2 0 002-2V6l-3-4z" />
    <line x1="3" y1="6" x2="17" y2="6" />
    <path d="M13 10a3 3 0 01-6 0" />
  </svg>

  {#if count > 0}
    <span class="fam-cart-badge" aria-hidden="true">
      {count > 99 ? '99+' : count}
    </span>
  {/if}
</button>

<CartDrawer bind:this={drawerRef} />

<style>
  .fam-cart-btn {
    position: relative;
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(245, 245, 240, 0.65);
    padding: 0.4rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: color 0.15s, background 0.15s;
  }
  .fam-cart-btn:hover {
    color: rgba(245, 245, 240, 0.95);
    background: rgba(245, 245, 240, 0.06);
  }

  .fam-cart-icon {
    width: 22px;
    height: 22px;
  }

  .fam-cart-badge {
    position: absolute;
    top: -2px;
    right: -4px;
    background: #7c3aed;
    color: #fff;
    font-family: var(--font-mono, monospace);
    font-size: 0.6rem;
    font-weight: 700;
    line-height: 1;
    min-width: 16px;
    height: 16px;
    padding: 0 3px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
