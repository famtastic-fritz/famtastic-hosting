<script lang="ts">
  export interface Column {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;       // e.g. "120px", "20%"
    align?: 'left' | 'right' | 'center';
  }

  // rows is an array of objects; each key corresponds to a Column.key
  // A row may also have a special _id and _href for row-level linking
  export let columns: Column[] = [];
  export let rows: Record<string, unknown>[] = [];
  export let searchable: boolean = true;
  export let searchPlaceholder: string = 'Search…';
  export let emptyMessage: string = 'No results found.';
  export let rowHref: ((row: Record<string, unknown>) => string) | undefined = undefined;

  let searchQuery = '';
  let sortKey = '';
  let sortDir: 'asc' | 'desc' = 'asc';

  function toggleSort(key: string) {
    if (!columns.find(c => c.key === key && c.sortable)) return;
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
  }

  $: filteredRows = rows.filter(row => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return Object.values(row).some(v =>
      v !== null && v !== undefined && String(v).toLowerCase().includes(q)
    );
  });

  $: sortedRows = sortKey
    ? [...filteredRows].sort((a, b) => {
        const av = String(a[sortKey] ?? '');
        const bv = String(b[sortKey] ?? '');
        const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : filteredRows;
</script>

<div class="db-table-wrapper">
  {#if searchable}
    <div class="db-table-controls">
      <div class="db-table-controls__search">
        <span class="db-table-controls__search-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </span>
        <input
          type="search"
          bind:value={searchQuery}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
        />
      </div>
      <slot name="controls" />
    </div>
  {/if}

  <div role="region" aria-label="Data table" style="overflow-x: auto;">
    <table class="db-table" aria-rowcount={sortedRows.length}>
      <thead>
        <tr>
          {#each columns as col (col.key)}
            <th
              style="{col.width ? `width: ${col.width};` : ''} text-align: {col.align ?? 'left'};"
              class={sortKey === col.key ? 'sorted' : ''}
              on:click={() => toggleSort(col.key)}
              on:keydown={(e) => e.key === 'Enter' && toggleSort(col.key)}
              tabindex={col.sortable ? 0 : undefined}
              role={col.sortable ? 'columnheader button' : 'columnheader'}
              aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              {col.label}
              {#if col.sortable}
                <span class="sort-icon" aria-hidden="true">
                  {sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              {/if}
            </th>
          {/each}
          <!-- slot for extra header cell (e.g. actions column) -->
          <slot name="header-extra" />
        </tr>
      </thead>
      <tbody>
        {#if sortedRows.length === 0}
          <tr>
            <td colspan={columns.length} class="db-table__empty" aria-live="polite">
              {emptyMessage}
            </td>
          </tr>
        {:else}
          {#each sortedRows as row, i (i)}
            <tr
              class={rowHref ? 'db-table-row--clickable' : ''}
              on:click={() => rowHref && window.location.assign(rowHref(row))}
            >
              {#each columns as col (col.key)}
                <td style="text-align: {col.align ?? 'left'};">
                  <slot name="cell" {row} {col} value={row[col.key]}>
                    {row[col.key] ?? '—'}
                  </slot>
                </td>
              {/each}
              <slot name="row-actions" {row} />
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  {#if sortedRows.length > 0}
    <div class="db-table-footer">
      <span>{sortedRows.length} row{sortedRows.length === 1 ? '' : 's'}</span>
      {#if searchQuery && filteredRows.length !== rows.length}
        <span>({rows.length} total)</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .db-table-row--clickable {
    cursor: pointer;
  }
  .db-table-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-top: 1px solid var(--db-border);
    font-size: 0.75rem;
    color: var(--db-text-muted);
    font-family: 'JetBrains Mono', monospace;
    background: rgba(255,255,255,0.01);
  }
</style>
