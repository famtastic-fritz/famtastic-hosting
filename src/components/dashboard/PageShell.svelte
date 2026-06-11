<script lang="ts">
  import DashboardNav from './DashboardNav.svelte';
  import ContactPhone from './ContactPhone.svelte';
  import type { NavVariant } from './DashboardNav.svelte';

  export let variant: NavVariant = 'customer';
  export let currentPath: string = '/dashboard';
  export let pageTitle: string = '';
  export let userName: string = '';
  export let userId: number = 0;

  let sidebarOpen = false;

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function closeSidebar() {
    sidebarOpen = false;
  }

  // Close sidebar on ESC
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && sidebarOpen) closeSidebar();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="db-root">
  <!-- Sidebar overlay (mobile) -->
  <div
    class="db-sidebar-overlay {sidebarOpen ? 'db-sidebar-overlay--visible' : ''}"
    on:click={closeSidebar}
    on:keydown={(e) => e.key === 'Enter' && closeSidebar()}
    role="presentation"
    aria-hidden="true"
  ></div>

  <!-- Sidebar nav (wired with open state for mobile) -->
  <div class="db-sidebar-slot {sidebarOpen ? 'db-sidebar-slot--open' : ''}" role="presentation">
    <DashboardNav {variant} {currentPath} {userName} {userId} />
  </div>

  <!-- Main content area -->
  <div class="db-shell__main">
    <!-- Topbar -->
    <header class="db-shell__topbar">
      <div class="db-flex-center db-gap-3">
        <button
          class="db-topbar-hamburger"
          on:click={toggleSidebar}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={sidebarOpen}
          aria-controls="dashboard-sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            {#if sidebarOpen}
              <path d="M18 6L6 18M6 6l12 12"/>
            {:else}
              <path d="M3 12h18M3 6h18M3 18h18"/>
            {/if}
          </svg>
        </button>
        {#if pageTitle}
          <h1 class="db-topbar-title">{pageTitle}</h1>
        {/if}
      </div>
      <div class="db-topbar-actions">
        <slot name="topbar-actions" />
        {#if userName}
          <div class="topbar-user-chip">
            {#if userId > 0}
              <span class="topbar-customer-id">#{String(userId).padStart(5, '0')}</span>
            {/if}
            <div class="db-topbar-avatar" aria-label="User: {userName}" title={userName}>
              {userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
          </div>
        {/if}
      </div>
    </header>

    <!-- Page content -->
    <main class="db-shell__content" id="main-content">
      <slot />
    </main>
  </div>
</div>

<style>
  :global(.db-sidebar-slot .db-shell__sidebar) {
    transform: translateX(-100%);
  }

  @media (min-width: 768px) {
    :global(.db-sidebar-slot .db-shell__sidebar) {
      transform: translateX(0) !important;
    }
  }

  @media (max-width: 767px) {
    :global(.db-sidebar-slot--open .db-shell__sidebar) {
      transform: translateX(0) !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    }
  }

  .topbar-user-chip {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .topbar-customer-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    font-weight: 600;
    color: #7c3aed;
    background: rgba(124, 58, 237, 0.1);
    border: 1px solid rgba(124, 58, 237, 0.2);
    padding: 3px 8px;
    border-radius: 6px;
    letter-spacing: 0.04em;
  }
</style>
