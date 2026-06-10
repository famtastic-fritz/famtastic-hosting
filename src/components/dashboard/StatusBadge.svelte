<script lang="ts">
  export type StatusVariant = 'active' | 'expiring' | 'expired' | 'pending' | 'neutral';

  export let status: StatusVariant = 'neutral';
  export let label: string | undefined = undefined;

  const labels: Record<StatusVariant, string> = {
    active:   'Active',
    expiring: 'Expiring Soon',
    expired:  'Expired',
    pending:  'Pending',
    neutral:  'Inactive',
  };

  $: displayLabel = label ?? labels[status];
  $: cssClass = `db-badge db-badge--${status}`;
</script>

<span class={cssClass} aria-label={`Status: ${displayLabel}`}>
  {displayLabel}
</span>
