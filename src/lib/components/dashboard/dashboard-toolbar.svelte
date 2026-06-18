<script lang="ts">
  import { resolve } from '$app/paths';
  import { Moon, Plus, RefreshCcw, Settings, Sun } from '@lucide/svelte';
  import { mode, toggleMode } from 'mode-watcher';
  import type { ChartType } from '$lib/app/chart-config';
  import { formatDateTime } from '$lib/utils';
  import { Button } from '$lib/components/ui/button/index.js';

  let {
    subtitle,
    lastUpdated,
    canRefresh,
    isRefreshing,
    disabled = false,
    onRefresh,
    onAddChart
  }: {
    subtitle: string;
    lastUpdated: Date | null;
    canRefresh: boolean;
    isRefreshing: boolean;
    disabled?: boolean;
    onRefresh: () => void | Promise<void>;
    onAddChart: (type: ChartType) => void;
  } = $props();

  const darkModeEnabled = $derived(mode.current === 'dark');
  const themeToggleLabel = $derived(
    darkModeEnabled ? 'Switch to light mode' : 'Switch to dark mode'
  );
</script>

<div>
  <header class="border-b border-border bg-card">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
        <a href={resolve('/')} class="text-xl font-semibold">YNAD</a>
        <p class="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        {#if isRefreshing}
          <span class="text-sm text-muted-foreground">Refreshing...</span>
        {:else}
          <span class="text-sm text-muted-foreground">Refreshed {formatDateTime(lastUpdated)}</span>
        {/if}

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

        <Button
          size="icon"
          variant="secondary"
          title={themeToggleLabel}
          aria-label={themeToggleLabel}
          onclick={toggleMode}
        >
          {#if darkModeEnabled}
            <Sun size={17} />
          {:else}
            <Moon size={17} />
          {/if}
        </Button>

        <Button
          size="icon"
          variant="secondary"
          title="Settings"
          aria-label="Settings"
          href={resolve('/app/settings')}
        >
          <Settings size={17} />
        </Button>
        <Button
          variant="primary"
          {disabled}
          onclick={() => {
            onAddChart('spending');
          }}
        >
          <Plus size={17} />
          Add chart
        </Button>
      </div>
    </div>
  </header>
</div>

<div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
  <div class="flex flex-row items-center space-x-3"></div>
</div>
