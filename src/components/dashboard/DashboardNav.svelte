<script lang="ts">
  import ContactPhone from './ContactPhone.svelte';

  export type NavVariant = 'customer' | 'admin';

  export let variant: NavVariant = 'customer';
  export let currentPath: string = '/dashboard';
  export let userName: string = '';

  interface NavItem {
    label: string;
    href: string;
    icon: string;  // SVG path d attribute(s) — 24x24 viewBox
    badge?: number;
  }

  const customerNav: { section: string; items: NavItem[] }[] = [
    {
      section: 'My Services',
      items: [
        {
          label: 'Overview',
          href: '/dashboard',
          icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
        },
        {
          label: 'Domains',
          href: '/dashboard/domains',
          icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
        },
        {
          label: 'Hosting',
          href: '/dashboard/hosting',
          icon: 'M5 12H3m18 0h-2M5.636 5.636L4.222 4.222m15.556 15.556l-1.414-1.414M12 5V3m0 18v-2m6.364-13.364l-1.414 1.414M7.05 16.95l-1.414 1.414M12 17a5 5 0 100-10 5 5 0 000 10z',
        },
        {
          label: 'Email',
          href: '/dashboard/email',
          icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
        },
        {
          label: 'Billing',
          href: '/dashboard/billing',
          icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
        },
      ],
    },
    {
      section: 'Account',
      items: [
        {
          label: 'Support',
          href: '/dashboard/support',
          icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
        },
      ],
    },
  ];

  const adminNav: { section: string; items: NavItem[] }[] = [
    {
      section: 'Revenue',
      items: [
        {
          label: 'Dashboard',
          href: '/admin',
          icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
        },
        {
          label: 'Orders',
          href: '/admin/orders',
          icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
        },
        {
          label: 'Reports',
          href: '/admin/reports',
          icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z',
        },
      ],
    },
    {
      section: 'Management',
      items: [
        {
          label: 'Customers',
          href: '/admin/customers',
          icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
        },
        {
          label: 'Products',
          href: '/admin/products',
          icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
        },
        {
          label: 'Provisioning',
          href: '/admin/provisioning',
          icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
        },
      ],
    },
    {
      section: 'Config',
      items: [
        {
          label: 'Settings',
          href: '/admin/settings',
          icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
        },
      ],
    },
  ];

  $: navGroups = variant === 'customer' ? customerNav : adminNav;

  function isActive(href: string): boolean {
    if (href === '/dashboard' || href === '/admin') {
      return currentPath === href;
    }
    return currentPath.startsWith(href);
  }

  // Initials for avatar
  $: initials = userName
    ? userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : (variant === 'admin' ? 'A' : 'U');
</script>

<nav class="db-shell__sidebar" aria-label="{variant === 'admin' ? 'Admin' : 'Customer'} navigation" role="navigation">
  <!-- Header / Branding -->
  <div class="db-sidebar-header">
    <a href={variant === 'admin' ? '/admin' : '/dashboard'} class="db-sidebar-logo" aria-label="FAMtastic Hosting home">
      <span class="mark">FAMtastic</span><span class="tld">.hosting</span>
    </a>
    {#if variant === 'admin'}
      <span class="admin-chip" aria-label="Admin view">Admin</span>
    {/if}
  </div>

  <!-- Navigation groups -->
  <div class="db-sidebar-nav" role="list">
    {#each navGroups as group (group.section)}
      <div class="db-nav-section" role="group" aria-label={group.section}>
        <div class="db-nav-section-label" aria-hidden="true">{group.section}</div>
        {#each group.items as item (item.href)}
          <a
            href={item.href}
            class="db-nav-item {isActive(item.href) ? 'db-nav-item--active' : ''}"
            aria-current={isActive(item.href) ? 'page' : undefined}
            role="listitem"
          >
            <svg
              class="db-nav-item__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d={item.icon}/>
            </svg>
            {item.label}
            {#if item.badge}
              <span class="db-nav-item__badge" aria-label="{item.badge} items">{item.badge}</span>
            {/if}
          </a>
        {/each}
      </div>
    {/each}
  </div>

  <!-- Footer: user info + support phone -->
  <div class="db-sidebar-footer">
    {#if userName}
      <div class="sidebar-user">
        <div class="db-topbar-avatar" aria-hidden="true">{initials}</div>
        <div class="sidebar-user__info">
          <div class="sidebar-user__name db-truncate">{userName}</div>
          <div class="sidebar-user__role">{variant === 'admin' ? 'Administrator' : 'Customer'}</div>
        </div>
      </div>
      <div style="height: 8px;"></div>
    {/if}
    <ContactPhone variant="sidebar" />
  </div>
</nav>

<style>
  .admin-chip {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: rgba(124, 58, 237, 0.15);
    color: #c4b5fd;
    border: 1px solid rgba(124, 58, 237, 0.3);
    padding: 2px 7px;
    border-radius: 9999px;
    flex-shrink: 0;
  }

  .sidebar-user {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 2px;
  }

  .sidebar-user__info {
    min-width: 0;
    flex: 1;
  }

  .sidebar-user__name {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--db-text-primary);
  }

  .sidebar-user__role {
    font-size: 0.7rem;
    color: var(--db-text-muted);
    font-family: 'JetBrains Mono', monospace;
    text-transform: capitalize;
  }
</style>
