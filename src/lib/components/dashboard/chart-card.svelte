<script lang="ts">
  import { onMount } from 'svelte';
  import {
    ArrowDown,
    ArrowUp,
    Copy,
    GripVertical,
    Maximize2,
    Minimize2,
    PanelRightOpen,
    Pencil,
    Trash2
  } from '@lucide/svelte';
  import { getChartMetadata, type ChartConfig, type ChartSize } from '$lib/app/chart-config';
  import ChartRenderer from '$lib/charts/chart-renderer.svelte';
  import type { ChartResult } from '$lib/charts/types';
  import type { NormalizedBudgetData } from '$lib/domain/types';
  import { cn } from '$lib/utils';

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
    onDrop
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
  } = $props();

  let isDesktop = $state(false);

  const cardSpan = $derived(
    chart.size === 'large' ? 'md:col-span-3' : chart.size === 'medium' ? 'md:col-span-2' : ''
  );
  const canMoveUp = $derived(index > 0);
  const canMoveDown = $derived(index < total - 1);

  const sizeOptions = [
    { value: 'small', label: 'Small', icon: Minimize2 },
    { value: 'medium', label: 'Medium', icon: PanelRightOpen },
    { value: 'large', label: 'Large', icon: Maximize2 }
  ] satisfies Array<{ value: ChartSize; label: string; icon: typeof Minimize2 }>;

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
          {getChartMetadata(chart, data ?? undefined)}
        </p>
      </div>
    </div>

    <button
      type="button"
      class="icon-button shrink-0"
      title="Edit chart"
      aria-label="Edit chart"
      {disabled}
      onclick={() => onEdit(chart)}
    >
      <Pencil size={16} />
    </button>
  </div>

  {#if editMode}
    <div
      class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"
      aria-label="Chart edit controls"
    >
      <div class="flex items-center gap-1 md:hidden">
        <button
          type="button"
          class="icon-button"
          title="Move up"
          aria-label="Move up"
          disabled={disabled || !canMoveUp}
          onclick={() => onMove(index, index - 1)}
        >
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          class="icon-button"
          title="Move down"
          aria-label="Move down"
          disabled={disabled || !canMoveDown}
          onclick={() => onMove(index, index + 1)}
        >
          <ArrowDown size={16} />
        </button>
      </div>

      <div class="flex items-center gap-1 rounded-md border border-border bg-background p-1">
        {#each sizeOptions as option (option.value)}
          {@const Icon = option.icon}
          <button
            type="button"
            class={cn(
              'grid size-8 place-items-center rounded-sm text-muted-foreground transition hover:bg-muted',
              chart.size === option.value && 'bg-primary text-primary-foreground hover:bg-primary'
            )}
            title={`${option.label} card`}
            aria-label={`${option.label} card`}
            aria-pressed={chart.size === option.value}
            {disabled}
            onclick={() => onResize(chart, option.value)}
          >
            <Icon size={15} />
          </button>
        {/each}
      </div>

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="icon-button"
          title="Duplicate"
          aria-label="Duplicate"
          {disabled}
          onclick={() => onDuplicate(chart)}
        >
          <Copy size={16} />
        </button>
        <button
          type="button"
          class="icon-button danger"
          title="Delete"
          aria-label="Delete"
          {disabled}
          onclick={() => onDelete(chart)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  {/if}

  <ChartRenderer
    {result}
    {chart}
    type={chart.type}
    currency={data?.budget.currencyFormat ?? null}
    loading={dataLoading}
  />
</article>
