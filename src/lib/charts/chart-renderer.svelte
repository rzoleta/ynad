<script lang="ts">
  import { scaleBand, scaleOrdinal } from 'd3-scale';
  import { BarChart, LineChart, PieChart } from 'layerchart';
  import { CircleDollarSign } from '@lucide/svelte';
  import * as Chart from '$lib/components/ui/chart';
  import type { ChartConfig as AppChartConfig, ChartType } from '$lib/app/chart-config';
  import { chartColorForKey, type ChartResult } from '$lib/charts/types';
  import { formatMilliunits, normalizeCurrencyFormat } from '$lib/domain/currency';
  import type { CurrencyFormat } from '$lib/domain/types';
  import { cn } from '$lib/utils';

  let {
    result,
    chart,
    type,
    currency = null,
    class: className
  }: {
    result: ChartResult;
    chart: AppChartConfig;
    type: ChartType;
    currency?: CurrencyFormat | null;
    class?: string;
  } = $props();

  const displayCurrency = $derived(currency ?? normalizeCurrencyFormat());
  const visual = $derived(
    result.status === 'series' ? result.visualization : (chart.visualization ?? 'bar')
  );
  const seriesColorKey = $derived(
    chart.type === 'number' ? `${chart.id}:${chart.numberMetric ?? 'number'}` : chart.id
  );
  const seriesColor = $derived(chartColorForKey(seriesColorKey));

  const points = $derived.by(() => {
    if (result.status !== 'series') return [];

    if (result.visualization === 'pie') {
      return result.points.map((point) => ({
        ...point,
        key: 'key' in point ? point.key : point.bucketId,
        value: Math.abs(point.valueMilliunits),
        fill: chartColorForKey('key' in point ? point.key : point.bucketId)
      }));
    }

    return result.points.map((point) => ({
      ...point,
      key: 'bucketId' in point ? point.bucketId : point.key,
      value: point.valueMilliunits,
      fill: seriesColor
    }));
  });

  const config = $derived.by<Chart.ChartConfig>(() => {
    if (visual === 'pie') {
      return points.reduce<Chart.ChartConfig>((next, point) => {
        next[point.key] = {
          label: point.label,
          color: point.fill
        };
        return next;
      }, {});
    }

    return {
      value: {
        label: chart.title,
        color: seriesColor
      }
    };
  });

  const pieColorScale = $derived(
    scaleOrdinal<string, string>()
      .domain(points.map((point) => point.key))
      .range(points.map((point) => point.fill))
  );

  const yDomain = $derived.by<[number, number]>(() => {
    const values = points.map((point) => point.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);

    if (min === 0 && max === 0) return [0, 1];
    return [min < 0 ? min : 0, max > 0 ? max : 0];
  });

  const excludedLabels = $derived(
    result.status === 'series' ? (result.excluded?.map((item) => item.label).join(', ') ?? '') : ''
  );

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

<div class={cn('mt-5 min-h-48 overflow-hidden', className)}>
  {#if result.status === 'number'}
    <div class="flex h-48 items-center rounded-md bg-background p-5">
      <div class="min-w-0">
        <p class="text-sm text-muted-foreground capitalize">{result.label}</p>
        <p class="mt-2 text-4xl font-semibold break-words">
          {formatMilliunits(result.valueMilliunits, displayCurrency)}
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
              {yDomain}
              series={[{ key: 'value', label: chart.title, color: seriesColor }]}
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
              cScale={pieColorScale}
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
              {yDomain}
              series={[{ key: 'value', label: chart.title, color: seriesColor }]}
              props={{
                xAxis: { format: formatXTick },
                yAxis: { format: formatAxisValue }
              }}
            />
          {/if}
        </Chart.Container>
      </div>
      {#if excludedLabels}
        <p class="text-xs text-muted-foreground">
          Excluded non-positive pie slices: {excludedLabels}
        </p>
      {/if}
    </div>
  {:else if result.status === 'error'}
    <div
      class="grid h-48 place-items-center rounded-md bg-danger/10 p-5 text-center text-danger"
      role="alert"
    >
      <div>
        <p class="font-medium">Chart could not load</p>
        <p class="mt-1 text-sm">{result.message}</p>
      </div>
    </div>
  {:else if type === 'number'}
    <div class="flex h-48 items-center rounded-md bg-background p-5">
      <div class="min-w-0">
        <p class="text-sm text-muted-foreground">{result.message}</p>
        <p class="mt-2 text-4xl font-semibold">--</p>
      </div>
    </div>
  {:else}
    <div
      class="grid h-48 place-items-center rounded-md bg-background p-5 text-center text-muted-foreground"
    >
      <div>
        <CircleDollarSign class="mx-auto mb-3 text-primary" size={28} />
        <p class="font-medium text-foreground">No matching data</p>
        <p class="mt-1 text-sm">{result.message}</p>
        <p class="mt-1 text-xs capitalize">{type} chart</p>
      </div>
    </div>
  {/if}
</div>
