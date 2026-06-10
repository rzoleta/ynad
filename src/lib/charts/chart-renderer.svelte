<script lang="ts">
  import { scaleBand, scaleOrdinal } from 'd3-scale';
  import { curveMonotoneX } from 'd3-shape';
  import { AreaChart, BarChart, PieChart } from 'layerchart';
  import { CircleDollarSign, LoaderCircle } from '@lucide/svelte';
  import * as Chart from '$lib/components/ui/chart';
  import type { ChartConfig as AppChartConfig, ChartType } from '$lib/app/chart-config';
  import { chartColorForKey, type ChartBreakdownData, type ChartResult } from '$lib/charts/types';
  import { formatMilliunits, normalizeCurrencyFormat } from '$lib/domain/currency';
  import type { CurrencyFormat } from '$lib/domain/types';
  import { cn } from '$lib/utils';
  import { Button } from '$lib/components/ui/button/index.js';

  let {
    result,
    chart,
    type,
    currency = null,
    loading = false,
    size = 'default',
    onReconnect,
    class: className
  }: {
    result: ChartResult;
    chart: AppChartConfig;
    type: ChartType;
    currency?: CurrencyFormat | null;
    loading?: boolean;
    size?: 'default' | 'builder';
    onReconnect?: () => void | Promise<void>;
    class?: string;
  } = $props();

  let chartContainerRef = $state<HTMLDivElement | null>(null);
  let chartHeight = $state(400);

  $effect(() => {
    if (!chartContainerRef) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chartHeight = entry.contentRect.height;
      }
    });

    observer.observe(chartContainerRef);
    return () => observer.disconnect();
  });

  const tooltipYPosition = $derived(chartHeight / 2);

  const displayCurrency = $derived(currency ?? normalizeCurrencyFormat());
  const visual = $derived(
    result.status === 'series' ? result.visualization : (chart.visualization ?? 'bar')
  );
  const seriesColorKey = $derived(
    chart.type === 'number' ? `${chart.id}:${chart.numberMetric ?? 'number'}` : chart.id
  );
  const seriesColor = $derived(chartColorForKey(seriesColorKey));

  const breakdown = $derived.by<ChartBreakdownData | undefined>(() => {
    if (result.status !== 'series') return undefined;
    return result.breakdown;
  });

  const hasBreakdown = $derived(breakdown !== undefined && breakdown.groups.length > 0);

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

  const breakdownData = $derived.by(() => {
    if (!hasBreakdown || !breakdown) return null;

    return breakdown.breakdownPoints.map((point) => {
      const row: Record<string, string | number> = { label: point.label };
      for (const group of breakdown.groups) {
        row[group.key] = point.values[group.key] ?? 0;
      }
      return row;
    });
  });

  const breakdownSeries = $derived.by(() => {
    if (!hasBreakdown || !breakdown) return [];

    return breakdown.groups.map((group, index) => ({
      key: group.key,
      label: group.label,
      value: (d: Record<string, unknown>) => (d[group.key] as number) ?? 0,
      color: group.key === '__others__' ? 'var(--muted-foreground)' : `var(--chart-${index + 1})`
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

    if (hasBreakdown && breakdown) {
      return breakdown.groups.reduce<Chart.ChartConfig>((next, group, index) => {
        next[group.key] = {
          label: group.label,
          color:
            group.key === '__others__' ? 'var(--muted-foreground)' : `var(--chart-${index + 1})`
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
    if (hasBreakdown && breakdown) {
      let min = 0;
      let max = 0;

      for (const point of breakdown.breakdownPoints) {
        let positiveSum = 0;
        let negativeSum = 0;
        for (const group of breakdown.groups) {
          const val = point.values[group.key] ?? 0;
          if (val >= 0) positiveSum += val;
          else negativeSum += val;
        }
        max = Math.max(max, positiveSum);
        min = Math.min(min, negativeSum);
      }

      if (min === 0 && max === 0) return [0, 1];
      return [min, max];
    }

    const values = points.map((point) => point.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);

    if (min === 0 && max === 0) return [0, 1];
    return [min < 0 ? min : 0, max > 0 ? max : 0];
  });

  const excludedLabels = $derived(
    result.status === 'series' ? (result.excluded?.map((item) => item.label).join(', ') ?? '') : ''
  );
  const summaryId = $derived(`chart-summary-${chart.id}`);
  const chartHeightClass = $derived(
    size === 'builder' ? 'min-h-[56vh] lg:min-h-[560px]' : 'min-h-[240px]'
  );
  const aspectClass = $derived(
    chart.size === 'medium'
      ? 'aspect-[16/5]'
      : chart.size === 'small'
        ? 'aspect-[16/10]'
        : 'aspect-[16/8]'
  );
  const placeholderHeightClass = $derived(cn(aspectClass, 'w-full', chartHeightClass));
  const chartAriaLabel = $derived.by(() => {
    const title = chart.title || `${type} chart`;

    if (result.status === 'number') {
      return `${title}. ${result.label}: ${formatMilliunits(result.valueMilliunits, displayCurrency)}.`;
    }

    if (result.status === 'series') {
      const pointSummary = points
        .slice(0, 5)
        .map((point) => `${point.label} ${formatMilliunits(point.value, displayCurrency)}`)
        .join(', ');
      const moreCount = points.length - 5;
      const moreSummary = moreCount > 0 ? `, plus ${moreCount} more` : '';
      const excludedSummary =
        result.excluded && result.excluded.length > 0
          ? ` ${result.excluded.length} non-positive pie ${result.excluded.length === 1 ? 'slice was' : 'slices were'} excluded.`
          : '';

      return `${title}. ${visual} chart with ${points.length} ${points.length === 1 ? 'point' : 'points'}${
        pointSummary ? `: ${pointSummary}${moreSummary}.` : '.'
      }${excludedSummary}`;
    }

    if (loading) return `${title}. Loading YNAB data.`;
    if (result.status === 'error') return `${title}. Chart could not load. ${result.message}`;
    return `${title}. No matching data. ${result.message}`;
  });

  function formatAxisValue(value: number) {
    return Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value / 1000);
  }

  function formatTooltipValue(value: unknown) {
    if (typeof value !== 'number') return String(value ?? '');
    return formatMilliunits(value, displayCurrency);
  }

  function formatXTick(value: unknown) {
    const label = String(value);

    if (chart.granularity === 'monthly') {
      const point = points.find((p) => p.label === label);
      if (point && 'from' in point && point.from) {
        const date = new Date(point.from);
        return date.toLocaleDateString(undefined, { month: 'short' });
      }
    }

    return label.length > 12 ? `${label.slice(0, 12)}...` : label;
  }

  const xAxisProps = {
    format: formatXTick,
    tickMarks: false,
    tickLabelProps: {
      rotate: -45,
      textAnchor: 'end',
      verticalAnchor: 'middle',
      dy: 10
    } as const
  };
</script>

<div class={cn('mt-5 min-h-48 overflow-hidden', className)}>
  {#if result.status === 'number'}
    <div class={cn('flex items-center rounded-md bg-background p-5', placeholderHeightClass)}>
      <div class="min-w-0">
        <p class="text-sm text-muted-foreground capitalize">{result.label}</p>
        <p class="mt-2 text-4xl font-semibold break-words">
          {formatMilliunits(result.valueMilliunits, displayCurrency)}
        </p>
      </div>
    </div>
  {:else if result.status === 'series'}
    <div class="space-y-3">
      <p id={summaryId} class="sr-only">{chartAriaLabel}</p>
      <div
        bind:this={chartContainerRef}
        class="rounded-md bg-background py-8 px-6"
        role="img"
        aria-labelledby={summaryId}
      >
        <Chart.Container {config} class={cn(aspectClass, chartHeightClass)}>
          {#if visual === 'line'}
            {#if hasBreakdown && breakdownData && breakdownSeries.length > 0}
              <AreaChart
                data={breakdownData}
                x="label"
                y={(d) =>
                  Object.values(d)
                    .filter((v) => typeof v === 'number')
                    .reduce((a, b) => a + b, 0)}
                axis={true}
                grid={true}
                {yDomain}
                series={breakdownSeries}
                seriesLayout="overlap"
                props={{
                  tooltip: {
                    item: { format: formatTooltipValue },
                    root: { x: 'data', y: tooltipYPosition }
                  },
                  area: {
                    curve: curveMonotoneX,
                    fillOpacity: 0.12,
                    line: {
                      curve: curveMonotoneX,
                      strokeWidth: 2.5,
                      'stroke-linecap': 'round',
                      'stroke-linejoin': 'round'
                    }
                  },
                  xAxis: xAxisProps,
                  yAxis: { format: formatAxisValue }
                }}
              />
            {:else}
              <AreaChart
                data={points}
                x="label"
                y="value"
                axis={true}
                grid={true}
                {yDomain}
                series={[{ key: 'value', label: chart.title, color: seriesColor }]}
                props={{
                  tooltip: {
                    item: { format: formatTooltipValue },
                    root: { x: 'data', y: tooltipYPosition }
                  },
                  area: {
                    curve: curveMonotoneX,
                    fillOpacity: 0.22,
                    line: {
                      curve: curveMonotoneX,
                      strokeWidth: 3,
                      'stroke-linecap': 'round',
                      'stroke-linejoin': 'round'
                    }
                  },
                  xAxis: xAxisProps,
                  yAxis: { format: formatAxisValue }
                }}
              />
            {/if}
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
              props={{ tooltip: { item: { format: formatTooltipValue } } }}
            />
          {:else if hasBreakdown && breakdownData && breakdownSeries.length > 0}
            <BarChart
              data={breakdownData}
              x="label"
              y={(d) =>
                Object.values(d)
                  .filter((v) => typeof v === 'number')
                  .reduce((a, b) => a + b, 0)}
              axis={true}
              grid={true}
              xScale={scaleBand().padding(0.32)}
              {yDomain}
              series={breakdownSeries}
              seriesLayout="stack"
              props={{
                tooltip: {
                  item: { format: formatTooltipValue },
                  root: { x: 'data', y: tooltipYPosition }
                },
                xAxis: xAxisProps,
                yAxis: { format: formatAxisValue }
              }}
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
                tooltip: {
                  item: { format: formatTooltipValue },
                  root: { x: 'data', y: tooltipYPosition }
                },
                xAxis: xAxisProps,
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
  {:else if loading}
    <div
      class={cn(
        'grid place-items-center rounded-md bg-background p-5 text-center text-muted-foreground',
        placeholderHeightClass
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <div>
        <LoaderCircle class="mx-auto mb-3 animate-spin text-primary" size={28} />
        <p class="font-medium text-foreground">Loading YNAB data</p>
      </div>
    </div>
  {:else if result.status === 'error'}
    <div
      class={cn(
        'grid place-items-center rounded-md p-5 text-center',
        result.code === 'reconnect-required'
          ? 'bg-card border border-border'
          : 'bg-danger/10 text-danger',
        placeholderHeightClass
      )}
      role="alert"
    >
      <div>
        <p class="font-medium text-foreground">
          {result.code === 'reconnect-required' ? 'YNAB connection expired' : 'Chart could not load'}
        </p>
        <p class="mt-1 text-sm text-muted-foreground">{result.message}</p>
        {#if result.code === 'reconnect-required' && onReconnect}
          <Button variant="primary" class="mt-4" onclick={onReconnect}>
            Reconnect to YNAB
          </Button>
        {/if}
      </div>
    </div>
  {:else if type === 'number'}
    <div class={cn('flex items-center rounded-md bg-background p-5', placeholderHeightClass)}>
      <div class="min-w-0">
        <p class="text-sm text-muted-foreground">{result.message}</p>
        <p class="mt-2 text-4xl font-semibold">--</p>
      </div>
    </div>
  {:else}
    <div
      class={cn(
        'grid place-items-center rounded-md bg-background p-5 text-center text-muted-foreground',
        placeholderHeightClass
      )}
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
