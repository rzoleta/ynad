<script lang="ts">
  import { isChartPreviewable, type ChartConfig } from '$lib/app/chart-config';
  import type { WeekStart } from '$lib/app/settings';
  import { computeChart, type ChartResult } from '$lib/charts/compute';
  import ChartRenderer from '$lib/charts/chart-renderer.svelte';
  import type { NormalizedBudgetData } from '$lib/domain/types';
  import { cn } from '$lib/utils';

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

  const previewClass = $derived(
    chart.size === 'small'
      ? 'max-w-[33%]'
      : chart.size === 'medium'
        ? 'max-w-[66%]'
        : 'max-w-full'
  );
</script>

<section class={cn('mx-auto', previewClass)}>
  <ChartRenderer
    {result}
    {chart}
    type={chart.type}
    currency={data?.budget.currencyFormat ?? null}
  />
</section>
