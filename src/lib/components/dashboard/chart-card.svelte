<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ArrowDown,
    ArrowUp,
    Copy,
    GripVertical,
    Pencil,
    Trash2
  } from '@lucide/svelte';
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
    onDuplicate,
    onDelete,
    onResize,
    onMove,
    onDragStart,
    onDrop,
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
    onDuplicate: (chart: ChartConfig) => void;
    onDelete: (chart: ChartConfig) => void;
    onResize: (chart: ChartConfig, size: ChartSize) => void;
    onMove: (from: number, to: number) => void;
    onDragStart: (index: number) => void;
    onDrop: (index: number) => void;
    onReconnect?: () => void | Promise<void>;
  } = $props();

  let isDesktop = $state(false);

  const cardSpan = $derived(
    chart.size === 'large' ? 'md:col-span-3' : chart.size === 'medium' ? 'md:col-span-2' : ''
  );
  const canMoveUp = $derived(index > 0);
  const canMoveDown = $derived(index < total - 1);

  const sizeOptions = [
    { value: 'small', label: 'Small', short: 'S' },
    { value: 'medium', label: 'Medium', short: 'M' },
    { value: 'large', label: 'Large', short: 'L' }
  ] satisfies Array<{ value: ChartSize; label: string; short: string }>;

  onMount(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const update = () => {
      isDesktop = media.matches;
    };

    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  });

  function handleDragStart() {
    if (disabled || !editMode || !isDesktop) return;
    onDragStart(index);
  }

  function handleDragOver(event: DragEvent) {
    if (disabled || !editMode || !isDesktop) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(event: DragEvent) {
    if (disabled || !editMode || !isDesktop) return;
    event.preventDefault();
    onDrop(index);
  }
</script>

<article
  role="listitem"
  class={cn(
    'rounded-lg border border-border bg-card p-4 shadow-sm transition',
    editMode && 'ring-1 ring-primary/15',
    cardSpan
  )}
  draggable={!disabled && editMode && isDesktop}
  ondragstart={handleDragStart}
  ondragover={handleDragOver}
  ondrop={handleDrop}
>
  <div class="flex items-start justify-between gap-3">
    <div class="flex min-w-0 items-start gap-2">
      {#if editMode}
        <button
          type="button"
          class="mt-0.5 hidden size-8 shrink-0 cursor-grab place-items-center rounded-md text-muted-foreground hover:bg-muted md:grid"
          title="Drag to reorder"
          aria-label="Drag to reorder"
          {disabled}
        >
          <GripVertical size={16} />
        </button>
      {/if}

      <div class="min-w-0">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <h2 class="min-w-0 font-semibold break-words">{chart.title}</h2>
        </div>
        <p class="mt-1 text-xs leading-5 text-muted-foreground">
          {getChartMetadata(chart)}
        </p>
      </div>
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-1">
      {#if editMode}
        <div class="grid grid-cols-3 w-[6rem] overflow-hidden rounded-md border border-border bg-background">
          {#each sizeOptions as option (option.value)}
            <button
              type="button"
              class={cn(
                'flex items-center justify-center h-8 text-xs border-r border-border transition last:border-r-0 hover:bg-muted',
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
        <Button
          size="icon"
          variant="secondary"
          title="Duplicate"
          aria-label="Duplicate"
          {disabled}
          onclick={() => onDuplicate(chart)}
        >
          <Copy size={16} />
        </Button>
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
