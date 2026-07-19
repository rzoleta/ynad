<script lang="ts">
  import { scaleBand, scaleOrdinal } from 'd3-scale';
  import { curveMonotoneX } from 'd3-shape';
  import { AreaChart, Bar, BarChart, PieChart, type ChartState } from 'layerchart';
  import * as Chart from '$lib/components/ui/chart';
  import { formatMilliunits, normalizeCurrencyFormat } from '$lib/domain/currency';
  import { cn } from '$lib/utils';
  import type { SampleChartSpec, SampleStackedRow } from './sample-data';

  let {
    spec,
    class: className
  }: {
    spec: SampleChartSpec;
    class?: string;
  } = $props();

  const usd = normalizeCurrencyFormat();

  function formatTooltipValue(value: unknown) {
    if (typeof value !== 'number') return String(value ?? '');
    return formatMilliunits(value, usd);
  }

  function formatAxisValue(value: number) {
    return Intl.NumberFormat(undefined, {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value / 1000);
  }

  const xAxisProps = {
    tickMarks: false,
    tickLabelProps: {
      rotate: -45,
      textAnchor: 'end',
      verticalAnchor: 'middle',
      dy: 10
    } as const
  };

  const config = $derived.by<Chart.ChartConfig>(() => {
    if (spec.kind === 'pie') {
      return spec.slices.reduce<Chart.ChartConfig>((next, slice) => {
        next[slice.key] = { label: slice.label, color: slice.fill };
        return next;
      }, {});
    }

    if (spec.kind === 'stacked-bar') {
      return spec.groups.reduce<Chart.ChartConfig>((next, group) => {
        next[group.key] = { label: group.label, color: group.color };
        return next;
      }, {});
    }

    return { value: { label: spec.title, color: spec.color } };
  });

  const yDomain = $derived.by<[number, number]>(() => {
    if (spec.kind === 'line') {
      const values = spec.points.map((point) => point.value);
      return [Math.min(...values, 0), Math.max(...values, 0)];
    }

    if (spec.kind === 'stacked-bar') {
      let max = 0;
      for (const row of spec.rows) {
        let sum = 0;
        for (const group of spec.groups) {
          sum += (row[group.key] as number) ?? 0;
        }
        max = Math.max(max, sum);
      }
      return [0, max];
    }

    return [0, 1];
  });

  const stackedSeries = $derived(
    spec.kind === 'stacked-bar'
      ? spec.groups.map((group) => ({
          key: group.key,
          label: group.label,
          value: (d: Record<string, unknown>) => (d[group.key] as number) ?? 0,
          color: group.color
        }))
      : []
  );

  const pieColorScale = $derived(
    spec.kind === 'pie'
      ? scaleOrdinal<string, string>()
          .domain(spec.slices.map((slice) => slice.key))
          .range(spec.slices.map((slice) => slice.fill))
      : scaleOrdinal<string, string>()
  );
</script>

{#snippet stackedMarks({ context }: { context: ChartState<SampleStackedRow> })}
  {#each context.series.visibleSeries as series, seriesIndex (series.key)}
    {#each spec.kind === 'stacked-bar' ? spec.rows : [] as datum (datum.label)}
      <Bar
        data={datum}
        seriesKey={series.key}
        fill={series.color}
        radius={4}
        rounded={seriesIndex === context.series.visibleSeries.length - 1 ? 'edge' : 'none'}
        strokeWidth={1}
      />
    {/each}
  {/each}
{/snippet}

<Chart.Container {config} class={cn('min-h-0', className)}>
  {#if spec.kind === 'line'}
    <AreaChart
      data={spec.points}
      x="label"
      y="value"
      axis={true}
      grid={true}
      {yDomain}
      series={[{ key: 'value', label: spec.title, color: spec.color }]}
      tooltipContext={{ mode: 'band' }}
      props={{
        tooltip: { item: { format: formatTooltipValue } },
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
  {:else if spec.kind === 'stacked-bar'}
    <BarChart
      data={spec.rows}
      x="label"
      y={(d: SampleStackedRow) =>
        Object.values(d)
          .filter((v) => typeof v === 'number')
          .reduce((a, b) => a + b, 0)}
      axis={true}
      grid={true}
      xScale={scaleBand().padding(0.32)}
      {yDomain}
      series={stackedSeries}
      seriesLayout="stack"
      marks={stackedMarks}
      props={{
        tooltip: { item: { format: formatTooltipValue } },
        xAxis: xAxisProps,
        yAxis: { format: formatAxisValue }
      }}
    />
  {:else}
    <PieChart
      data={spec.slices}
      key="key"
      label="label"
      value="value"
      c="key"
      cScale={pieColorScale}
      innerRadius={0.58}
      padAngle={0.02}
      labels={{ value: 'label' }}
      props={{ tooltip: { item: { format: formatTooltipValue } } }}
    />
  {/if}
</Chart.Container>
