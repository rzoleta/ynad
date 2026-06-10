<script lang="ts">
  import { resolve } from '$app/paths';
  import { Check, Pencil, Plus, RefreshCcw, Settings } from '@lucide/svelte';
  import type { ChartType } from '$lib/app/chart-config';
  import { formatDateTime } from '$lib/utils';
  import { Button } from '$lib/components/ui/button/index.js';

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
      {#if !editMode}
        <span class="text-sm text-muted-foreground">Updated {formatDateTime(lastUpdated)}</span>
        <Button
          size="icon"
          variant="secondary"
          title="Refresh YNAB data"
          aria-label="Refresh YNAB data"
          disabled={!canRefresh || isRefreshing}
          onclick={onRefresh}
        >
          <RefreshCcw size={17} class={isRefreshing ? 'animate-spin' : ''} />
        </Button>
        <Button size="icon" variant="secondary" title="Settings" aria-label="Settings" href={resolve('/app/settings')}>
          <Settings size={17} />
        </Button>
      {/if}
      <Button
        variant="secondary"
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
      </Button>
      {#if !editMode}
        <Button
          variant="primary"
          {disabled}
          onclick={() => onAddChart('spending')}
        >
          <Plus size={17} />
          Add chart
        </Button>
      {/if}
    </div>
  </div>
</header>
