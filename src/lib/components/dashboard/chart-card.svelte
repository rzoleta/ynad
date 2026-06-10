<script lang="ts">
  import { dragHandle } from 'svelte-dnd-action';
  import { ArrowDown, ArrowUp, GripVertical, Pencil, Trash2 } from '@lucide/svelte';
  import { getChartMetadata, type ChartConfig, type ChartSize } from '$lib/app/chart-config';
  import ChartRenderer from '$lib/charts/chart-renderer.svelte';
  import type { ChartResult } from '$lib/charts/types';
  import type { NormalizedBudgetData } from '$lib/domain/types';
  import { cn } from '$lib/utils';
  import { Button } from '$lib/components/ui/button/index.js';

  let {
    chart,
    result,
    data,
    dataLoading,
    disabled = false,
    editMode,
    index,
    total,
    onEdit,
    onDelete,
    onResize,
    onMove,
    onReconnect
  }: {
    chart: ChartConfig;
    result: ChartResult;
    data: NormalizedBudgetData | null;
    dataLoading: boolean;
    disabled?: boolean;
    editMode: boolean;
    index: number;
    total: number;
    onEdit: (chart: ChartConfig) => void;
    onDelete: (chart: ChartConfig) => void;
    onResize: (chart: ChartConfig, size: ChartSize) => void;
    onMove: (from: number, to: number) => void;
    onReconnect?: () => void | Promise<void>;
  } = $props();

  const canMoveUp = $derived(index > 0);
  const canMoveDown = $derived(index < total - 1);

  const sizeOptions = [
    { value: 'small', label: 'Small', short: 'S' },
    { value: 'medium', label: 'Medium', short: 'M' },
    { value: 'large', label: 'Large', short: 'L' }
  ] satisfies Array<{ value: ChartSize; label: string; short: string }>;
</script>

<article
  class={cn(
    'h-full rounded-lg border border-border bg-card p-4 transition-[border-color,box-shadow,transform,background-color]',
    'hover:border-foreground/20 hover:shadow-sm',
    editMode && 'shadow-sm'
  )}
>
  <div class="flex items-start justify-between gap-3">
    <div class="flex h-10 min-w-0 items-start gap-2">
      {#if editMode}
        <button
          type="button"
          use:dragHandle
          class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border border-transparent text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          title="Drag to reorder"
          aria-label="Drag to reorder"
          disabled={disabled || total < 2}
        >
          <GripVertical size={16} />
        </button>

        <div class="grid h-10 grid-cols-3 overflow-hidden rounded-sm border border-border bg-card">
          {#each sizeOptions as option (option.value)}
            <button
              type="button"
              class={cn(
                'flex w-9 items-center justify-center border-r border-border text-xs transition last:border-r-0 hover:bg-muted',
                chart.size === option.value && 'bg-primary text-primary-foreground hover:bg-primary'
              )}
              title={`${option.label} card`}
              aria-label={`${option.label} card`}
              aria-pressed={chart.size === option.value}
              {disabled}
              onclick={() => onResize(chart, option.value)}
            >
              {option.short}
            </button>
          {/each}
        </div>
      {:else}
        <div class="min-w-0">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <h2 class="min-w-0 font-semibold break-words">{chart.title}</h2>
          </div>
          <p class="mt-1 text-xs leading-5 text-muted-foreground">
            {getChartMetadata(chart)}
          </p>
        </div>
      {/if}
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-1">
      {#if editMode}
        <Button
          size="icon"
          variant="danger-outline"
          title="Delete"
          aria-label="Delete"
          {disabled}
          onclick={() => onDelete(chart)}
        >
          <Trash2 size={16} />
        </Button>
      {/if}
      <Button
        size="icon"
        variant="secondary"
        class="shrink-0"
        title="Edit chart"
        aria-label="Edit chart"
        {disabled}
        onclick={() => onEdit(chart)}
      >
        <Pencil size={16} />
      </Button>
    </div>
  </div>

  {#if editMode}
    <div
      class="mt-4 flex items-center gap-2 border-t border-border pt-3 md:hidden"
      aria-label="Chart edit controls"
    >
      <div class="flex items-center gap-1">
        <Button
          size="icon"
          variant="secondary"
          title="Move up"
          aria-label="Move up"
          disabled={disabled || !canMoveUp}
          onclick={() => onMove(index, index - 1)}
        >
          <ArrowUp size={16} />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          title="Move down"
          aria-label="Move down"
          disabled={disabled || !canMoveDown}
          onclick={() => onMove(index, index + 1)}
        >
          <ArrowDown size={16} />
        </Button>
      </div>
    </div>
  {/if}

  <ChartRenderer
    {result}
    {chart}
    type={chart.type}
    currency={data?.budget.currencyFormat ?? null}
    loading={dataLoading}
    {onReconnect}
  />
</article>
