<script lang="ts">
  import { scaleBand, scaleOrdinal } from 'd3-scale';
  import { BarChart, LineChart, PieChart } from 'layerchart';
  import { CircleDollarSign } from '@lucide/svelte';
  import * as Chart from '$lib/components/ui/chart';
  import type { ChartConfig as AppChartConfig, ChartType } from '$lib/app/chart-config';
  import type { ChartResult } from '$lib/charts/compute';
  import { formatMilliunits } from '$lib/domain/currency';
  import { cn } from '$lib/utils';

  let {
    result,
    chart,
    type,
    class: className
  }: {
    result: ChartResult;
    chart: AppChartConfig;
    type: ChartType;
    class?: string;
  } = $props();

  const colors = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)'
  ];

  const points = $derived(
    result.status === 'series'
      ? result.points.map((point, index) => ({
          ...point,
          key: point.label,
          fill: colors[index % colors.length]
        }))
      : []
  );

  const config = $derived(
    points.reduce<Chart.ChartConfig>((next, point, index) => {
      next[point.key] = {
        label: point.label,
        color: colors[index % colors.length]
      };
      return next;
    }, {})
  );

  const visual = $derived(chart.visualization ?? 'bar');
  const maxAbs = $derived(Math.max(...points.map((point) => Math.abs(point.value)), 1));

  function formatAxisValue(value: number) {
    return Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value / 1000);
  }

  function formatXTick(value: unknown) {
    const label = String(value);
    return label.length > 12 ? `${label.slice(0, 12)}...` : label;
  }
</script>

<div class={cn('mt-5 min-h-48', className)}>
  {#if result.status === 'number'}
    <div class="flex h-48 items-center rounded-md bg-background p-5">
      <div>
        <p class="text-sm text-muted-foreground capitalize">{result.label}</p>
        <p class="mt-2 text-4xl font-semibold">
          {formatMilliunits(result.value, result.currency)}
        </p>
      </div>
    </div>
  {:else if result.status === 'series'}
    <div class="space-y-3">
      <div class="rounded-md bg-background px-2 py-4">
        <Chart.Container {config} class="min-h-[240px]">
          {#if visual === 'line'}
            <LineChart
              data={points}
              x="label"
              y="value"
              axis={true}
              grid={true}
              yDomain={[-maxAbs, maxAbs]}
              series={[{ key: 'value', label: chart.title, color: 'var(--chart-1)' }]}
              props={{
                xAxis: { format: formatXTick },
                yAxis: { format: formatAxisValue }
              }}
            />
          {:else if visual === 'pie'}
            <PieChart
              data={points}
              key="key"
              label="label"
              value="value"
              c="key"
              cScale={scaleOrdinal(colors)}
              innerRadius={0.58}
              padAngle={0.02}
              labels={true}
            />
          {:else}
            <BarChart
              data={points}
              x="label"
              y="value"
              axis={true}
              grid={true}
              xScale={scaleBand().padding(0.32)}
              yDomain={[-maxAbs, maxAbs]}
              series={[{ key: 'value', label: chart.title, color: 'var(--chart-1)' }]}
              props={{
                xAxis: { format: formatXTick },
                yAxis: { format: formatAxisValue }
              }}
            />
          {/if}
        </Chart.Container>
      </div>
      {#if result.excluded?.length}
        <p class="text-xs text-muted-foreground">
          Excluded non-positive pie slices: {result.excluded.join(', ')}
        </p>
      {/if}
    </div>
  {:else if result.status === 'error'}
    <div class="grid h-48 place-items-center rounded-md bg-danger/10 p-5 text-center text-danger">
      {result.message}
    </div>
  {:else}
    <div
      class="grid h-48 place-items-center rounded-md bg-background p-5 text-center text-muted-foreground"
    >
      <div>
        <CircleDollarSign class="mx-auto mb-3 text-primary" size={28} />
        <p>{result.message}</p>
        <p class="mt-1 text-xs capitalize">{type} chart</p>
      </div>
    </div>
  {/if}
</div>
