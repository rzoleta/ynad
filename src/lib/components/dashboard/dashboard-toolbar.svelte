<script lang="ts">
  import { resolve } from '$app/paths';
  import { Check, Pencil, Plus, RefreshCcw, Settings } from '@lucide/svelte';
  import type { ChartType } from '$lib/app/chart-config';
  import { formatDateTime } from '$lib/utils';

  let {
    subtitle,
    lastUpdated,
    canRefresh,
    isRefreshing,
    editMode,
    disabled = false,
    onRefresh,
    onToggleEdit,
    onAddChart
  }: {
    subtitle: string;
    lastUpdated: Date | null;
    canRefresh: boolean;
    isRefreshing: boolean;
    editMode: boolean;
    disabled?: boolean;
    onRefresh: () => void | Promise<void>;
    onToggleEdit: () => void;
    onAddChart: (type: ChartType) => void;
  } = $props();
</script>

<header class="border-b border-border bg-card">
  <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
    <div>
      <a href={resolve('/')} class="text-xl font-semibold">YNAD</a>
      <p class="text-sm text-muted-foreground">{subtitle}</p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="text-sm text-muted-foreground">Updated {formatDateTime(lastUpdated)}</span>
      <button
        type="button"
        class="icon-button"
        title="Refresh YNAB data"
        aria-label="Refresh YNAB data"
        disabled={!canRefresh || isRefreshing}
        onclick={onRefresh}
      >
        <RefreshCcw size={17} class={isRefreshing ? 'animate-spin' : ''} />
      </button>
      <a class="icon-button" title="Settings" aria-label="Settings" href={resolve('/app/settings')}>
        <Settings size={17} />
      </a>
      <button
        type="button"
        class="button secondary"
        aria-pressed={editMode}
        {disabled}
        onclick={onToggleEdit}
      >
        {#if editMode}
          <Check size={17} />
          Done
        {:else}
          <Pencil size={17} />
          Edit dashboard
        {/if}
      </button>
      <button
        type="button"
        class="button primary"
        {disabled}
        onclick={() => onAddChart('spending')}
      >
        <Plus size={17} />
        Add chart
      </button>
    </div>
  </div>
</header>
