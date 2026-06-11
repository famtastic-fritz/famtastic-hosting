<script lang="ts">
  import { onMount } from 'svelte';

  // ── State ─────────────────────────────────────────────────────────────────
  let open = false;
  let loading = false;
  let items: Array<{
    id: number;
    name: string;
    retail_price_cents: number;
    quantity: number;
  }> = [];
  let subtotalUSD = '$0.00';
  let errorMsg = '';

  // ── Public API (parent calls via bind:this) ────────────────────────────────
  export function openDrawer() {
    open = true;
    fetchCart();
  }

  export function closeDrawer() {
    open = false;
  }

  // ── Data fetching ─────────────────────────────────────────────────────────
  async function fetchCart() {
    loading = true;
    errorMsg = '';
    try {
      const res = await fetch('/api/cart');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      items = data.items ?? [];
      subtotalUSD = data.subtotalUSD ?? '$0.00';
    } catch (e) {
      errorMsg = 'Could not load cart. Try again.';
    } finally {
      loading = false;
    }
  }

  // ── Quantity update ───────────────────────────────────────────────────────
  async function handleQuantityChange(itemId: number, quantity: number) {
    if (quantity < 0) return;
    try {
      const res = await fetch('/api/cart/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      items = data.items ?? [];
      subtotalUSD = data.subtotalUSD ?? '$0.00';
    } catch {
      errorMsg = 'Failed to update item.';
    }
  }

  // ── Remove item ───────────────────────────────────────────────────────────
  async function removeItem(itemId: number) {
    await handleQuantityChange(itemId, 0);
  }

  // ── Format ────────────────────────────────────────────────────────────────
  function formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }

  onMount(() => {
    // Pre-fetch so the count is known on initial open
  });
</script>

<!-- Backdrop -->
{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="fam-cart-backdrop"
    on:click={closeDrawer}
    aria-hidden="true"
  ></div>
{/if}

<!-- Drawer panel -->
<aside
  class="fam-cart-drawer"
  class:fam-cart-drawer--open={open}
  aria-label="Shopping cart"
  aria-hidden={!open}
>
  <!-- Header -->
  <div class="fam-cart-header">
    <span class="fam-cart-title">Your Cart</span>
    <button class="fam-cart-close" on:click={closeDrawer} aria-label="Close cart">
      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <line x1="2" y1="2" x2="12" y2="12" />
        <line x1="12" y1="2" x2="2" y2="12" />
      </svg>
    </button>
  </div>

  <!-- Body -->
  <div class="fam-cart-body">
    {#if loading}
      <div class="fam-cart-state">Loading…</div>
    {:else if errorMsg}
      <div class="fam-cart-state fam-cart-state--error">{errorMsg}</div>
    {:else if items.length === 0}
      <div class="fam-cart-state">
        <svg class="fam-cart-empty-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
          <circle cx="20" cy="20" r="18" stroke-opacity="0.3" />
          <path d="M12 14h2l3 10h10l2-8H15" stroke-opacity="0.5" />
          <circle cx="17" cy="26" r="1.5" fill="currentColor" opacity="0.4" />
          <circle cx="24" cy="26" r="1.5" fill="currentColor" opacity="0.4" />
        </svg>
        <p>Your cart is empty.</p>
      </div>
    {:else}
      <ul class="fam-cart-items">
        {#each items as item (item.id)}
          <li class="fam-cart-item">
            <div class="fam-cart-item-name">{item.name}</div>
            <div class="fam-cart-item-row">
              <div class="fam-cart-item-qty">
                <button
                  class="fam-cart-qty-btn"
                  on:click={() => handleQuantityChange(item.id, item.quantity - 1)}
                  aria-label="Decrease quantity"
                >−</button>
                <input
                  class="fam-cart-qty-input"
                  type="number"
                  min="0"
                  value={item.quantity}
                  on:change={(e) => {
                    const target = /** @type {HTMLInputElement} */ (e.target);
                    const val = parseInt(target.value, 10);
                    if (!isNaN(val)) handleQuantityChange(item.id, val);
                  }}
                  aria-label="Quantity"
                />
                <button
                  class="fam-cart-qty-btn"
                  on:click={() => handleQuantityChange(item.id, item.quantity + 1)}
                  aria-label="Increase quantity"
                >+</button>
              </div>
              <div class="fam-cart-item-price">
                {formatPrice(item.retail_price_cents * item.quantity)}
              </div>
              <button
                class="fam-cart-remove"
                on:click={() => removeItem(item.id)}
                aria-label={`Remove ${item.name}`}
              >
                <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
                  <line x1="1" y1="1" x2="11" y2="11" />
                  <line x1="11" y1="1" x2="1" y2="11" />
                </svg>
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Footer -->
  {#if items.length > 0}
    <div class="fam-cart-footer">
      <div class="fam-cart-subtotal">
        <span>Subtotal</span>
        <span class="fam-cart-subtotal-val">{subtotalUSD}</span>
      </div>
      <a href="/checkout" class="fam-cart-checkout-btn">Checkout</a>
    </div>
  {/if}
</aside>

<style>
  /* ── Backdrop ─────────────────────────────────────────────────────────── */
  .fam-cart-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 998;
    backdrop-filter: blur(2px);
  }

  /* ── Drawer ───────────────────────────────────────────────────────────── */
  .fam-cart-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: min(400px, 100vw);
    height: 100dvh;
    background: #0f0f14;
    border-left: 1px solid rgba(245, 245, 240, 0.08);
    z-index: 999;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }

  .fam-cart-drawer--open {
    transform: translateX(0);
  }

  /* ── Header ───────────────────────────────────────────────────────────── */
  .fam-cart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid rgba(245, 245, 240, 0.08);
    flex-shrink: 0;
  }

  .fam-cart-title {
    font-family: var(--font-mono, 'Courier New', monospace);
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(245, 245, 240, 0.6);
  }

  .fam-cart-close {
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(245, 245, 240, 0.4);
    padding: 0.25rem;
    display: flex;
    align-items: center;
    transition: color 0.15s;
  }
  .fam-cart-close:hover {
    color: rgba(245, 245, 240, 0.9);
  }
  .fam-cart-close svg {
    width: 16px;
    height: 16px;
  }

  /* ── Body ─────────────────────────────────────────────────────────────── */
  .fam-cart-body {
    flex: 1;
    overflow-y: auto;
    padding: 1rem 1.5rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(245, 245, 240, 0.1) transparent;
  }

  /* ── Empty / state ────────────────────────────────────────────────────── */
  .fam-cart-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem 0;
    color: rgba(245, 245, 240, 0.35);
    font-size: 0.875rem;
    text-align: center;
  }
  .fam-cart-state--error {
    color: #f87171;
  }
  .fam-cart-empty-icon {
    width: 56px;
    height: 56px;
    color: rgba(245, 245, 240, 0.2);
  }

  /* ── Items list ───────────────────────────────────────────────────────── */
  .fam-cart-items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .fam-cart-item {
    padding: 1rem 0;
    border-bottom: 1px solid rgba(245, 245, 240, 0.06);
  }

  .fam-cart-item-name {
    font-size: 0.875rem;
    color: rgba(245, 245, 240, 0.85);
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .fam-cart-item-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  /* ── Quantity controls ────────────────────────────────────────────────── */
  .fam-cart-item-qty {
    display: flex;
    align-items: center;
    gap: 0;
    border: 1px solid rgba(245, 245, 240, 0.12);
    border-radius: 4px;
    overflow: hidden;
  }

  .fam-cart-qty-btn {
    background: rgba(245, 245, 240, 0.04);
    border: none;
    color: rgba(245, 245, 240, 0.6);
    width: 28px;
    height: 28px;
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
  }
  .fam-cart-qty-btn:hover {
    background: rgba(124, 58, 237, 0.25);
    color: rgba(245, 245, 240, 0.9);
  }

  .fam-cart-qty-input {
    width: 36px;
    text-align: center;
    background: transparent;
    border: none;
    color: rgba(245, 245, 240, 0.85);
    font-size: 0.8rem;
    font-family: var(--font-mono, monospace);
    -moz-appearance: textfield;
    outline: none;
  }
  .fam-cart-qty-input::-webkit-inner-spin-button,
  .fam-cart-qty-input::-webkit-outer-spin-button {
    -webkit-appearance: none;
  }

  /* ── Price & remove ───────────────────────────────────────────────────── */
  .fam-cart-item-price {
    flex: 1;
    text-align: right;
    font-family: var(--font-mono, monospace);
    font-size: 0.8rem;
    color: rgba(245, 245, 240, 0.7);
  }

  .fam-cart-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: rgba(245, 245, 240, 0.25);
    padding: 0.25rem;
    display: flex;
    align-items: center;
    transition: color 0.15s;
    flex-shrink: 0;
  }
  .fam-cart-remove:hover {
    color: #f87171;
  }
  .fam-cart-remove svg {
    width: 12px;
    height: 12px;
  }

  /* ── Footer ───────────────────────────────────────────────────────────── */
  .fam-cart-footer {
    padding: 1.25rem 1.5rem;
    border-top: 1px solid rgba(245, 245, 240, 0.08);
    flex-shrink: 0;
  }

  .fam-cart-subtotal {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    color: rgba(245, 245, 240, 0.5);
  }

  .fam-cart-subtotal-val {
    font-family: var(--font-mono, monospace);
    font-size: 1rem;
    color: rgba(245, 245, 240, 0.9);
    font-weight: 600;
  }

  .fam-cart-checkout-btn {
    display: block;
    width: 100%;
    text-align: center;
    background: #7c3aed;
    color: #fff;
    padding: 0.85rem 1.5rem;
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
    border-radius: 2px;
    transition: background 0.15s;
  }
  .fam-cart-checkout-btn:hover {
    background: #6d28d9;
  }
</style>
