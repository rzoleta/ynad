<script lang="ts">
  import { isChartPreviewable, type ChartConfig } from '$lib/app/chart-config';
  import type { WeekStart } from '$lib/app/settings';
  import { computeChart, type ChartResult } from '$lib/charts/compute';
  import ChartRenderer from '$lib/charts/chart-renderer.svelte';
  import type { NormalizedBudgetData } from '$lib/domain/types';

  let {
    chart,
    data,
    weekStart
  }: {
    chart: ChartConfig;
    data: NormalizedBudgetData | null;
    weekStart: WeekStart;
  } = $props();

  const result = $derived.by<ChartResult>(() => {
    if (!isChartPreviewable(chart)) {
      return { status: 'empty', message: 'Complete the chart settings to preview this chart.' };
    }

    return computeChart(chart, data, weekStart);
  });
</script>

<div>
  <div class="flex items-center justify-between gap-3">
    <p class="text-sm font-medium">Preview</p>
    <span class="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
      {chart.type}
    </span>
  </div>
  <ChartRenderer
    {result}
    {chart}
    type={chart.type}
    currency={data?.budget.currencyFormat ?? null}
    class="mt-3"
  />
</div>
