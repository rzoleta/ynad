<script lang="ts">
  import { dragHandle } from 'svelte-dnd-action';
  import { GripVertical, Pencil } from '@lucide/svelte';
  import { getChartMetadata, type ChartConfig } from '$lib/app/chart-config';
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
    total,
    onEdit,
    onReconnect
  }: {
    chart: ChartConfig;
    result: ChartResult;
    data: NormalizedBudgetData | null;
    dataLoading: boolean;
    disabled?: boolean;
    total: number;
    onEdit: (chart: ChartConfig) => void;
    onReconnect?: () => void | Promise<void>;
  } = $props();
</script>

<article
  class={cn(
    'group h-full rounded-lg border border-border bg-card p-4 transition-[border-color,box-shadow,transform,background-color]',
    'hover:border-foreground/20 hover:shadow-sm'
  )}
>
  <div class="flex items-start justify-between gap-3">
    <div class="flex h-10 min-w-0 items-start gap-2">
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
      <Button
        size="icon"
        variant="secondary"
        class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        title="Edit chart"
        aria-label="Edit chart"
        {disabled}
        onclick={() => onEdit(chart)}
      >
        <Pencil size={16} />
      </Button>
    </div>
  </div>

  <ChartRenderer
    {result}
    {chart}
    type={chart.type}
    currency={data?.budget.currencyFormat ?? null}
    loading={dataLoading}
    {onReconnect}
  />
</article>
